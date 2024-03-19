import { Session } from '@shopify/shopify-api';
import { db } from '../db/db.js';
import { getNewWorkOrderName } from '../id-formatting.js';
import { unit } from '../db/unit-of-work.js';
import { CreateWorkOrder } from '../../schemas/generated/create-work-order.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { validateCreateWorkOrder } from './validate.js';
import { syncWorkOrder } from './sync.js';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { IGetItemsResult } from '../db/queries/generated/work-order.sql.js';
import {
  IGetFixedPriceLabourChargesResult,
  IGetHourlyLabourChargesResult,
} from '../db/queries/generated/work-order-charges.sql.js';
import { cleanOrphanedDraftOrders } from './clean-orphaned-draft-orders.js';
import { ensureCustomersExist } from '../customer/sync.js';
import { ensureShopifyOrdersExist } from '../shopify-order/sync.js';
import { ensureProductVariantsExist } from '../product-variants/sync.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { ensureEmployeesExist } from '../employee/sync.js';
import { assertGidOrNull } from '../../util/assertions.js';

export async function upsertWorkOrder(session: Session, createWorkOrder: CreateWorkOrder) {
  return await unit(async () => {
    await validateCreateWorkOrder(session.shop, createWorkOrder);

    if (createWorkOrder.name === null) {
      return await createNewWorkOrder(session, { ...createWorkOrder, name: createWorkOrder.name });
    }

    return await updateWorkOrder(session, { ...createWorkOrder, name: createWorkOrder.name });
  });
}

async function createNewWorkOrder(session: Session, createWorkOrder: CreateWorkOrder & { name: null }) {
  await ensureCustomersExist(session, [createWorkOrder.customerId]);

  if (createWorkOrder.derivedFromOrderId !== null) {
    await ensureShopifyOrdersExist(session, [createWorkOrder.derivedFromOrderId]);
  }

  const [workOrder = never()] = await db.workOrder.upsert({
    shop: session.shop,
    name: await getNewWorkOrderName(session.shop),
    derivedFromOrderId: createWorkOrder.derivedFromOrderId,
    customerId: createWorkOrder.customerId,
    dueDate: new Date(createWorkOrder.dueDate),
    status: createWorkOrder.status,
    note: createWorkOrder.note,
  });

  for (const [key, value] of Object.entries(createWorkOrder.customFields)) {
    await db.workOrder.insertCustomField({ workOrderId: workOrder.id, key, value });
  }

  await upsertItems(session, createWorkOrder, workOrder.id, []);
  await upsertCharges(session, createWorkOrder, workOrder.id, [], []);

  await syncWorkOrder(session, workOrder.id, true);

  return workOrder;
}

async function updateWorkOrder(session: Session, createWorkOrder: CreateWorkOrder & { name: string }) {
  const [workOrder = never()] = await db.workOrder.get({ shop: session.shop, name: createWorkOrder.name });

  await cleanOrphanedDraftOrders(session, workOrder.id, async () => {
    const currentItems = await db.workOrder.getItems({ workOrderId: workOrder.id });
    const currentHourlyCharges = await db.workOrderCharges.getHourlyLabourCharges({ workOrderId: workOrder.id });
    const currentFixedPriceCharges = await db.workOrderCharges.getFixedPriceLabourCharges({
      workOrderId: workOrder.id,
    });

    // not all changes are allowed, e.g., once you create an order for some item it is no longer possible to change its price
    assertNoIllegalItemChanges(createWorkOrder, currentItems);
    assertNoIllegalHourlyChargeChanges(createWorkOrder, currentHourlyCharges);
    assertNoIllegalFixedPriceChargeChanges(createWorkOrder, currentFixedPriceCharges);

    const currentLinkedOrders = await db.shopifyOrder.getLinkedOrdersByWorkOrderId({ workOrderId: workOrder.id });
    const hasOrder = currentLinkedOrders.some(hasPropertyValue('orderType', 'ORDER'));
    if (createWorkOrder.customerId !== workOrder.customerId && hasOrder) {
      throw new HttpError('Cannot change customer after the order has been created', 400);
    }

    // nothing illegal, so we can upsert and delete items/charges safely

    await db.workOrder.upsert({
      shop: session.shop,
      name: workOrder.name,
      status: createWorkOrder.status,
      customerId: createWorkOrder.customerId,
      dueDate: new Date(createWorkOrder.dueDate),
      derivedFromOrderId: createWorkOrder.derivedFromOrderId,
      note: createWorkOrder.note,
    });

    await db.workOrder.removeCustomFields({ workOrderId: workOrder.id });
    for (const [key, value] of Object.entries(createWorkOrder.customFields)) {
      await db.workOrder.insertCustomField({ workOrderId: workOrder.id, key, value });
    }

    await upsertItems(session, createWorkOrder, workOrder.id, currentItems);
    await upsertCharges(session, createWorkOrder, workOrder.id, currentHourlyCharges, currentFixedPriceCharges);

    await deleteCharges(createWorkOrder, workOrder.id, currentHourlyCharges, currentFixedPriceCharges);
    await deleteItems(createWorkOrder, workOrder.id, currentItems);
  });

  await syncWorkOrder(session, workOrder.id, true);

  return workOrder;
}

function assertNoIllegalItemChanges(createWorkOrder: CreateWorkOrder, currentItems: IGetItemsResult[]) {
  const newItemsByUuid = Object.fromEntries(createWorkOrder.items.map(item => [item.uuid, item]));

  for (const currentItem of currentItems) {
    if (isLineItemId(currentItem.shopifyOrderLineItemId)) {
      if (!(currentItem.uuid in newItemsByUuid)) {
        throw new HttpError(`Cannot delete item ${currentItem.uuid} as it is connected to an order`, 400);
      }

      const newItem = newItemsByUuid[currentItem.uuid] ?? never();

      if (newItem.productVariantId !== currentItem.productVariantId) {
        throw new HttpError(`Cannot change product variant of item ${currentItem.uuid}`, 400);
      }

      if (newItem.quantity !== currentItem.quantity) {
        throw new HttpError(`Cannot change quantity of item ${currentItem.uuid}`, 400);
      }
    }
  }
}

function assertNoIllegalHourlyChargeChanges(
  createWorkOrder: CreateWorkOrder,
  currentHourlyCharges: IGetHourlyLabourChargesResult[],
) {
  const newHourlyChargesByUuid = Object.fromEntries(
    createWorkOrder.charges.filter(hasPropertyValue('type', 'hourly-labour')).map(charge => [charge.uuid, charge]),
  );

  for (const currentCharge of currentHourlyCharges) {
    if (isLineItemId(currentCharge.shopifyOrderLineItemId)) {
      if (!(currentCharge.uuid in newHourlyChargesByUuid)) {
        throw new HttpError(`Cannot delete hourly charge ${currentCharge.uuid} as it is connected to an order`, 400);
      }

      const newCharge = newHourlyChargesByUuid[currentCharge.uuid] ?? never();

      if (newCharge.name !== currentCharge.name) {
        throw new HttpError(`Cannot change name of hourly charge ${newCharge.uuid}`, 400);
      }

      if (newCharge.rate !== newCharge.rate) {
        throw new HttpError(`Cannot change rate of hourly charge ${newCharge.uuid}`, 400);
      }

      if (newCharge.hours !== newCharge.hours) {
        throw new HttpError(`Cannot change hours of hourly charge ${newCharge.uuid}`, 400);
      }
    }
  }
}

function assertNoIllegalFixedPriceChargeChanges(
  createWorkOrder: CreateWorkOrder,
  currentFixedPriceCharges: IGetFixedPriceLabourChargesResult[],
) {
  const newFixedPriceChargesByUuid = Object.fromEntries(
    createWorkOrder.charges.filter(hasPropertyValue('type', 'fixed-price-labour')).map(charge => [charge.uuid, charge]),
  );

  for (const currentCharge of currentFixedPriceCharges) {
    if (isLineItemId(currentCharge.shopifyOrderLineItemId)) {
      if (!(currentCharge.uuid in newFixedPriceChargesByUuid)) {
        throw new HttpError(
          `Cannot delete fixed price charge ${currentCharge.uuid} as it is connected to an order`,
          400,
        );
      }

      const newCharge = newFixedPriceChargesByUuid[currentCharge.uuid] ?? never();

      if (newCharge.name !== currentCharge.name) {
        throw new HttpError(`Cannot change name of fixed price charge ${newCharge.uuid}`, 400);
      }

      if (newCharge.amount !== newCharge.amount) {
        throw new HttpError(`Cannot change amount of fixed price charge ${newCharge.uuid}`, 400);
      }
    }
  }
}

async function upsertItems(
  session: Session,
  createWorkOrder: CreateWorkOrder,
  workOrderId: number,
  currentItems: IGetItemsResult[],
) {
  const itemsByUuid = Object.fromEntries(currentItems.map(item => [item.uuid, item]));

  await ensureProductVariantsExist(session, unique(createWorkOrder.items.map(item => item.productVariantId)));

  for (const item of createWorkOrder.items) {
    const shopifyOrderLineItemId = itemsByUuid[item.uuid]?.shopifyOrderLineItemId ?? null;

    await db.workOrder.upsertItem({
      uuid: item.uuid,
      productVariantId: item.productVariantId,
      quantity: item.quantity,
      workOrderId,
      shopifyOrderLineItemId,
      absorbCharges: item.absorbCharges,
    });
  }
}

async function upsertCharges(
  session: Session,
  createWorkOrder: CreateWorkOrder,
  workOrderId: number,
  currentHourlyCharges: IGetHourlyLabourChargesResult[],
  currentFixedPriceCharges: IGetFixedPriceLabourChargesResult[],
) {
  const currentHourlyChargeByUuid = Object.fromEntries(currentHourlyCharges.map(charge => [charge.uuid, charge]));
  const currentFixedPriceChargeByUuid = Object.fromEntries(
    currentFixedPriceCharges.map(charge => [charge.uuid, charge]),
  );

  const employeeIds = unique(
    createWorkOrder.charges
      .map(charge => {
        assertGidOrNull(charge.employeeId);
        return charge.employeeId;
      })
      .filter(isNonNullable),
  );
  await ensureEmployeesExist(session, employeeIds);

  for (const charge of createWorkOrder.charges) {
    if (charge.type === 'fixed-price-labour') {
      const shopifyOrderLineItemId = currentFixedPriceChargeByUuid[charge.uuid]?.shopifyOrderLineItemId ?? null;

      await db.workOrderCharges.upsertFixedPriceLabourCharge({
        workOrderId,
        name: charge.name,
        uuid: charge.uuid,
        amount: charge.amount,
        workOrderItemUuid: charge.workOrderItemUuid,
        employeeId: charge.employeeId,
        shopifyOrderLineItemId,
      });
    } else if (charge.type === 'hourly-labour') {
      const shopifyOrderLineItemId = currentHourlyChargeByUuid[charge.uuid]?.shopifyOrderLineItemId ?? null;

      await db.workOrderCharges.upsertHourlyLabourCharge({
        workOrderId,
        name: charge.name,
        uuid: charge.uuid,
        rate: charge.rate,
        hours: charge.hours,
        workOrderItemUuid: charge.workOrderItemUuid,
        employeeId: charge.employeeId,
        shopifyOrderLineItemId,
      });
    } else {
      return charge satisfies never;
    }
  }
}

async function deleteItems(createWorkOrder: CreateWorkOrder, workOrderId: number, currentItems: IGetItemsResult[]) {
  const newItemUuids = new Set(createWorkOrder.items.map(item => item.uuid));

  for (const { uuid } of currentItems) {
    if (!newItemUuids.has(uuid)) {
      await db.workOrder.removeItem({ workOrderId, uuid });
    }
  }
}

async function deleteCharges(
  createWorkOrder: CreateWorkOrder,
  workOrderId: number,
  currentHourlyCharges: IGetHourlyLabourChargesResult[],
  currentFixedPriceCharges: IGetFixedPriceLabourChargesResult[],
) {
  const newHourlyChargesByUuid = new Set(
    createWorkOrder.charges.filter(hasPropertyValue('type', 'hourly-labour')).map(charge => charge.uuid),
  );
  const newFixedPriceChargesByUuid = new Set(
    createWorkOrder.charges.filter(hasPropertyValue('type', 'fixed-price-labour')).map(charge => charge.uuid),
  );

  for (const { uuid } of currentHourlyCharges) {
    if (!newHourlyChargesByUuid.has(uuid)) {
      await db.workOrderCharges.removeHourlyLabourCharge({ workOrderId, uuid });
    }
  }

  for (const { uuid } of currentFixedPriceCharges) {
    if (!newFixedPriceChargesByUuid.has(uuid)) {
      await db.workOrderCharges.removeFixedPriceLabourCharge({ workOrderId, uuid });
    }
  }
}

function isLineItemId(id: string | null) {
  return id !== null && parseGid(id).objectName === 'LineItem';
}
