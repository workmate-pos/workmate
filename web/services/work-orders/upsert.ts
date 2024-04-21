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
import { LocalsTeifiUser } from '../../decorators/permission.js';

export async function upsertWorkOrder(
  session: Session,
  user: LocalsTeifiUser | null,
  createWorkOrder: CreateWorkOrder,
) {
  return await unit(async () => {
    await validateCreateWorkOrder(session.shop, createWorkOrder);

    if (createWorkOrder.name === null) {
      return await createNewWorkOrder(session, { ...createWorkOrder, name: createWorkOrder.name });
    }

    return await updateWorkOrder(session, user, { ...createWorkOrder, name: createWorkOrder.name });
  });
}

async function createNewWorkOrder(session: Session, createWorkOrder: CreateWorkOrder & { name: null }) {
  await ensureRequiredDatabaseDataExists(session, createWorkOrder);

  const [workOrder = never()] = await db.workOrder.upsert({
    shop: session.shop,
    name: await getNewWorkOrderName(session.shop),
    derivedFromOrderId: createWorkOrder.derivedFromOrderId,
    customerId: createWorkOrder.customerId,
    dueDate: new Date(createWorkOrder.dueDate),
    status: createWorkOrder.status,
    note: createWorkOrder.note,
    internalNote: createWorkOrder.internalNote,
    discountAmount: createWorkOrder.discount?.value,
    discountType: createWorkOrder.discount?.type,
  });

  for (const [key, value] of Object.entries(createWorkOrder.customFields)) {
    await db.workOrder.insertCustomField({ workOrderId: workOrder.id, key, value });
  }

  await upsertItems(session, createWorkOrder, workOrder.id, []);
  await upsertCharges(session, createWorkOrder, workOrder.id, [], []);

  await syncWorkOrder(session, workOrder.id, true);

  return workOrder;
}

async function updateWorkOrder(
  session: Session,
  user: LocalsTeifiUser | null,
  createWorkOrder: CreateWorkOrder & { name: string },
) {
  const [workOrder = never()] = await db.workOrder.get({ shop: session.shop, name: createWorkOrder.name });

  await cleanOrphanedDraftOrders(session, workOrder.id, async () => {
    const currentItems = await db.workOrder.getItems({ workOrderId: workOrder.id });
    const currentHourlyCharges = await db.workOrderCharges.getHourlyLabourCharges({ workOrderId: workOrder.id });
    const currentFixedPriceCharges = await db.workOrderCharges.getFixedPriceLabourCharges({
      workOrderId: workOrder.id,
    });

    // not all changes are allowed, e.g., once you create an order for some item it is no longer possible to change its price.
    // additionally, locked fields can only be changed/unlocked by superusers
    assertNoIllegalItemChanges(createWorkOrder, currentItems);
    assertNoIllegalHourlyChargeChanges(createWorkOrder, currentHourlyCharges, user?.user.superuser ?? false);
    assertNoIllegalFixedPriceChargeChanges(createWorkOrder, currentFixedPriceCharges, user?.user.superuser ?? false);

    const currentLinkedOrders = await db.shopifyOrder.getLinkedOrdersByWorkOrderId({ workOrderId: workOrder.id });
    const hasOrder = currentLinkedOrders.some(hasPropertyValue('orderType', 'ORDER'));
    if (createWorkOrder.customerId !== workOrder.customerId && hasOrder) {
      throw new HttpError('Cannot change customer after an order has been created', 400);
    }

    // nothing illegal, so we can upsert and delete items/charges safely

    await ensureRequiredDatabaseDataExists(session, createWorkOrder);

    await db.workOrder.upsert({
      shop: session.shop,
      name: workOrder.name,
      status: createWorkOrder.status,
      customerId: createWorkOrder.customerId,
      dueDate: new Date(createWorkOrder.dueDate),
      derivedFromOrderId: createWorkOrder.derivedFromOrderId,
      note: createWorkOrder.note,
      internalNote: createWorkOrder.internalNote,
      discountAmount: createWorkOrder.discount?.value,
      discountType: createWorkOrder.discount?.type,
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

async function ensureRequiredDatabaseDataExists(session: Session, createWorkOrder: CreateWorkOrder) {
  const errors: unknown[] = [];

  await Promise.all([
    ensureCustomersExist(session, [createWorkOrder.customerId]).catch(error => errors.push(error)),
    createWorkOrder.derivedFromOrderId
      ? ensureShopifyOrdersExist(session, [createWorkOrder.derivedFromOrderId]).catch(error => errors.push(error))
      : null,
  ]);

  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to ensure required database data exists');
  }
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
  superuser: boolean,
) {
  const newHourlyChargesByUuid = Object.fromEntries(
    createWorkOrder.charges.filter(hasPropertyValue('type', 'hourly-labour')).map(charge => [charge.uuid, charge]),
  );

  // TODO: New permission for this?
  const canUnlock = superuser;

  for (const oldCharge of currentHourlyCharges) {
    const isLineItem = isLineItemId(oldCharge.shopifyOrderLineItemId);

    if (isLineItem && !(oldCharge.uuid in newHourlyChargesByUuid)) {
      throw new HttpError(`Cannot delete hourly charge ${oldCharge.uuid} as it is connected to an order`, 400);
    }

    if (oldCharge.removeLocked && !canUnlock && !(oldCharge.uuid in newHourlyChargesByUuid)) {
      throw new HttpError(`Cannot remove hourly charge ${oldCharge.uuid} as it is locked`, 400);
    }

    const newCharge = newHourlyChargesByUuid[oldCharge.uuid] ?? never();

    if (isLineItem && newCharge.name !== oldCharge.name) {
      throw new HttpError(`Cannot change name of hourly charge ${newCharge.uuid}`, 400);
    }

    const rateIsLocked = oldCharge.rateLocked && !superuser;

    if ((isLineItem || rateIsLocked) && newCharge.rate !== oldCharge.rate) {
      throw new HttpError(`Cannot change rate of hourly charge ${newCharge.uuid}`, 400);
    }

    const hoursIsLocked = oldCharge.hoursLocked && !superuser;

    if ((isLineItem || hoursIsLocked) && newCharge.hours !== oldCharge.hours) {
      throw new HttpError(`Cannot change hours of hourly charge ${newCharge.uuid}`, 400);
    }

    const unlocksRateLock = oldCharge.rateLocked && !newCharge.rateLocked;

    if ((isLineItem && newCharge.rateLocked !== oldCharge.rateLocked) || (!canUnlock && unlocksRateLock)) {
      throw new HttpError(`Cannot change rate lock of hourly charge ${newCharge.uuid}`, 400);
    }

    const unlocksHoursLock = oldCharge.hoursLocked && !newCharge.hoursLocked;

    if ((isLineItem && newCharge.hoursLocked !== oldCharge.hoursLocked) || (!canUnlock && unlocksHoursLock)) {
      throw new HttpError(`Cannot change hours lock of hourly charge ${newCharge.uuid}`, 400);
    }

    const unlocksRemoveLock = oldCharge.removeLocked && !newCharge.removeLocked;

    if ((isLineItem && newCharge.removeLocked !== oldCharge.removeLocked) || (!canUnlock && unlocksRemoveLock)) {
      throw new HttpError(`Cannot change remove lock of hourly charge ${newCharge.uuid}`, 400);
    }
  }
}

function assertNoIllegalFixedPriceChargeChanges(
  createWorkOrder: CreateWorkOrder,
  currentFixedPriceCharges: IGetFixedPriceLabourChargesResult[],
  superuser: boolean,
) {
  const newFixedPriceChargesByUuid = Object.fromEntries(
    createWorkOrder.charges.filter(hasPropertyValue('type', 'fixed-price-labour')).map(charge => [charge.uuid, charge]),
  );

  const canUnlock = superuser;

  for (const oldCharge of currentFixedPriceCharges) {
    const isLineItem = isLineItemId(oldCharge.shopifyOrderLineItemId);

    if (isLineItem && !(oldCharge.uuid in newFixedPriceChargesByUuid)) {
      throw new HttpError(`Cannot delete fixed price charge ${oldCharge.uuid} as it is connected to an order`, 400);
    }

    if (oldCharge.removeLocked && !canUnlock && !(oldCharge.uuid in newFixedPriceChargesByUuid)) {
      throw new HttpError(`Cannot remove fixed price charge ${oldCharge.uuid} as it is locked`, 400);
    }

    const newCharge = newFixedPriceChargesByUuid[oldCharge.uuid] ?? never();

    if (isLineItem && newCharge.name !== oldCharge.name) {
      throw new HttpError(`Cannot change name of fixed price charge ${newCharge.uuid}`, 400);
    }

    const amountIsLocked = oldCharge.amountLocked && !superuser;

    if ((isLineItem || amountIsLocked) && newCharge.amount !== oldCharge.amount) {
      throw new HttpError(`Cannot change amount of fixed price charge ${newCharge.uuid}`, 400);
    }

    const unlocksAmountLock = oldCharge.amountLocked && !newCharge.amountLocked;

    if ((isLineItem && newCharge.amountLocked !== oldCharge.amountLocked) || (!canUnlock && unlocksAmountLock)) {
      throw new HttpError(`Cannot change amount lock of fixed price charge ${newCharge.uuid}`, 400);
    }

    const unlocksRemoveLock = oldCharge.removeLocked && !newCharge.removeLocked;

    if ((isLineItem && newCharge.removeLocked !== oldCharge.removeLocked) || (!canUnlock && unlocksRemoveLock)) {
      throw new HttpError(`Cannot change remove lock of fixed price charge ${newCharge.uuid}`, 400);
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
        shopifyOrderLineItemId,
        employeeId: charge.employeeId,
        amountLocked: charge.amountLocked,
        removeLocked: charge.removeLocked,
        workOrderItemUuid: charge.workOrderItemUuid,
      });
    } else if (charge.type === 'hourly-labour') {
      const shopifyOrderLineItemId = currentHourlyChargeByUuid[charge.uuid]?.shopifyOrderLineItemId ?? null;

      await db.workOrderCharges.upsertHourlyLabourCharge({
        workOrderId,
        name: charge.name,
        uuid: charge.uuid,
        rate: charge.rate,
        hours: charge.hours,
        shopifyOrderLineItemId,
        rateLocked: charge.rateLocked,
        employeeId: charge.employeeId,
        hoursLocked: charge.hoursLocked,
        removeLocked: charge.removeLocked,
        workOrderItemUuid: charge.workOrderItemUuid,
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
