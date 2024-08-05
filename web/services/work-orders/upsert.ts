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

// TODO: Support deleted customer/company

export async function upsertWorkOrder(
  session: Session,
  user: LocalsTeifiUser | null,
  createWorkOrder: CreateWorkOrder,
) {
  await validateCreateWorkOrder(session, createWorkOrder, user?.user.superuser ?? false);

  if (createWorkOrder.name === null) {
    return await createNewWorkOrder(session, { ...createWorkOrder, name: createWorkOrder.name });
  }

  return await updateWorkOrder(session, { ...createWorkOrder, name: createWorkOrder.name });
}

async function createNewWorkOrder(session: Session, createWorkOrder: CreateWorkOrder & { name: null }) {
  return await unit(async () => {
    await ensureRequiredDatabaseDataExists(session, createWorkOrder);

    const [workOrder = never()] = await db.workOrder.upsert({
      shop: session.shop,
      name: await getNewWorkOrderName(session.shop),
      derivedFromOrderId: createWorkOrder.derivedFromOrderId,
      customerId: createWorkOrder.customerId,
      companyId: createWorkOrder.companyId,
      companyLocationId: createWorkOrder.companyLocationId,
      companyContactId: createWorkOrder.companyContactId,
      dueDate: new Date(createWorkOrder.dueDate),
      status: createWorkOrder.status,
      note: createWorkOrder.note,
      internalNote: createWorkOrder.internalNote,
      discountAmount: createWorkOrder.discount?.value,
      discountType: createWorkOrder.discount?.type,
      paymentFixedDueDate: createWorkOrder.paymentTerms?.date,
      paymentTermsTemplateId: createWorkOrder.paymentTerms?.templateId,
    });

    await upsertItems(session, createWorkOrder, workOrder.id, []);
    await upsertCharges(session, createWorkOrder, workOrder.id, [], []);

    await Promise.all([
      insertWorkOrderCustomFields(workOrder.id, createWorkOrder.customFields),
      insertItemCustomFields(workOrder.id, createWorkOrder.items),
    ]);

    await syncWorkOrder(session, workOrder.id);

    return workOrder;
  });
}

async function updateWorkOrder(session: Session, createWorkOrder: CreateWorkOrder & { name: string }) {
  const [workOrder = never()] = await db.workOrder.get({
    shop: session.shop,
    name: createWorkOrder.name,
  });

  const { id: workOrderId } = workOrder;

  return await cleanOrphanedDraftOrders(session, workOrderId, () =>
    unit(async () => {
      const currentLinkedOrders = await db.shopifyOrder.getLinkedOrdersByWorkOrderId({ workOrderId: workOrder.id });
      const hasOrder = currentLinkedOrders.some(hasPropertyValue('orderType', 'ORDER'));

      // TODO: Move to validation
      if (createWorkOrder.customerId !== workOrder.customerId && hasOrder) {
        throw new HttpError('Cannot change customer after an order has been created', 400);
      }

      if (createWorkOrder.companyId !== workOrder.companyId && hasOrder) {
        throw new HttpError('Cannot change company after an order has been created', 400);
      }

      if (createWorkOrder.companyLocationId !== workOrder.companyLocationId && hasOrder) {
        throw new HttpError('Cannot change company location after an order has been created', 400);
      }

      if (createWorkOrder.companyId !== workOrder.companyId && hasOrder) {
        throw new HttpError('Cannot change company after an order has been created', 400);
      }

      // nothing illegal, so we can upsert and delete items/charges safely

      await ensureRequiredDatabaseDataExists(session, createWorkOrder);

      await db.workOrder.upsert({
        name: workOrder.name,
        shop: session.shop,
        status: createWorkOrder.status,
        customerId: createWorkOrder.customerId,
        // TODO:  checkt if they exist
        companyId: createWorkOrder.companyId,
        companyLocationId: createWorkOrder.companyLocationId,
        companyContactId: createWorkOrder.companyContactId,
        dueDate: new Date(createWorkOrder.dueDate),
        derivedFromOrderId: createWorkOrder.derivedFromOrderId,
        note: createWorkOrder.note,
        internalNote: createWorkOrder.internalNote,
        discountAmount: createWorkOrder.discount?.value,
        discountType: createWorkOrder.discount?.type,
        paymentFixedDueDate: createWorkOrder.paymentTerms?.date,
        paymentTermsTemplateId: createWorkOrder.paymentTerms?.templateId,
      });

      const currentItems = await db.workOrder.getItems({ workOrderId });
      const currentHourlyCharges = await db.workOrderCharges.getHourlyLabourCharges({ workOrderId });
      const currentFixedPriceCharges = await db.workOrderCharges.getFixedPriceLabourCharges({ workOrderId });

      await removeCustomFields(workOrderId);

      await upsertItems(session, createWorkOrder, workOrderId, currentItems);
      await upsertCharges(session, createWorkOrder, workOrderId, currentHourlyCharges, currentFixedPriceCharges);

      await deleteCharges(createWorkOrder, workOrderId, currentHourlyCharges, currentFixedPriceCharges);
      await deleteItems(createWorkOrder, workOrderId, currentItems);

      await Promise.all([
        insertWorkOrderCustomFields(workOrderId, createWorkOrder.customFields),
        insertItemCustomFields(workOrderId, createWorkOrder.items),
      ]);

      await syncWorkOrder(session, workOrderId);

      return workOrder;
    }),
  );
}

async function removeCustomFields(workOrderId: number) {
  await db.workOrder.removeCustomFields({ workOrderId });
  await db.workOrder.removeItemCustomFields({ workOrderId });
}

async function insertWorkOrderCustomFields(workOrderId: number, customFields: Record<string, string>) {
  if (Object.keys(customFields).length === 0) {
    return;
  }

  await db.workOrder.insertCustomFields({
    customFields: Object.entries(customFields).map(([key, value]) => ({ workOrderId, key, value })),
  });
}

async function insertItemCustomFields(workOrderId: number, items: CreateWorkOrder['items']) {
  // TODO: Fix this - support custom fields on custom items (first migrate database discriminated unions to jsonb with zod + safeql)
  //       -> also do this for labour (decreases duplicated code by a shit ton)
  // TODO: Once done, add back custom fields (ItemConfig: itemType !== 'custom-item', WorkOrder: item.type !== 'custom-item')
  const customFields = items
    .filter(hasPropertyValue('type', 'custom-item'))
    .flatMap(({ customFields, uuid: workOrderItemUuid }) =>
      Object.entries(customFields).map(([key, value]) => ({ workOrderId, workOrderItemUuid, key, value })),
    );

  if (customFields.length === 0) {
    return;
  }

  await db.workOrder.insertItemCustomFields({ customFields });
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

async function upsertItems(
  session: Session,
  createWorkOrder: CreateWorkOrder,
  workOrderId: number,
  currentItems: IGetItemsResult[],
) {
  const itemsByUuid = Object.fromEntries(currentItems.map(item => [item.uuid, item]));

  if (!createWorkOrder.items.length) {
    return;
  }

  const productItems = createWorkOrder.items.filter(hasPropertyValue('type', 'product'));
  const customItems = createWorkOrder.items.filter(hasPropertyValue('type', 'custom-item'));

  await ensureProductVariantsExist(session, unique(productItems.map(item => item.productVariantId)));

  await Promise.all([
    productItems.length &&
      db.workOrder.upsertItems({
        items: productItems.map(({ productVariantId, absorbCharges, quantity, uuid }) => ({
          shopifyOrderLineItemId: itemsByUuid[uuid]?.shopifyOrderLineItemId ?? null,
          productVariantId,
          absorbCharges,
          workOrderId,
          quantity,
          uuid,
        })),
      }),
    customItems.length &&
      db.workOrder.upsertCustomItems({
        items: customItems.map(({ name, unitPrice, absorbCharges, quantity, uuid }) => ({
          shopifyOrderLineItemId: itemsByUuid[uuid]?.shopifyOrderLineItemId ?? null,
          absorbCharges,
          workOrderId,
          unitPrice,
          quantity,
          uuid,
          name,
        })),
      }),
  ]);
}

// TODO: Proper linking to work order item / custom item
async function upsertCharges(
  session: Session,
  createWorkOrder: CreateWorkOrder,
  workOrderId: number,
  currentHourlyCharges: IGetHourlyLabourChargesResult[],
  currentFixedPriceCharges: IGetFixedPriceLabourChargesResult[],
) {
  const employeeIds = unique(
    createWorkOrder.charges
      .map(charge => {
        assertGidOrNull(charge.employeeId);
        return charge.employeeId;
      })
      .filter(isNonNullable),
  );
  await ensureEmployeesExist(session, employeeIds);

  const currentHourlyChargeByUuid = Object.fromEntries(currentHourlyCharges.map(charge => [charge.uuid, charge]));
  const currentFixedPriceChargeByUuid = Object.fromEntries(
    currentFixedPriceCharges.map(charge => [charge.uuid, charge]),
  );

  const hourlyLabourCharges = createWorkOrder.charges.filter(hasPropertyValue('type', 'hourly-labour')).map(charge => ({
    workOrderId,
    employeeId: charge.employeeId,
    name: charge.name,
    rate: charge.rate,
    hours: charge.hours,
    workOrderItemUuid: [charge.workOrderItem].filter(isNonNullable).filter(hasPropertyValue('type', 'product'))[0]
      ?.uuid,
    workOrderCustomItemUuid: [charge.workOrderItem]
      .filter(isNonNullable)
      .filter(hasPropertyValue('type', 'custom-item'))[0]?.uuid,
    shopifyOrderLineItemId: currentHourlyChargeByUuid[charge.uuid]?.shopifyOrderLineItemId ?? null,
    uuid: charge.uuid,
    rateLocked: charge.rateLocked,
    hoursLocked: charge.hoursLocked,
    removeLocked: charge.removeLocked,
  }));

  const fixedPriceLabourCharges = createWorkOrder.charges
    .filter(hasPropertyValue('type', 'fixed-price-labour'))
    .map(charge => ({
      workOrderId,
      employeeId: charge.employeeId,
      name: charge.name,
      amount: charge.amount,
      workOrderItemUuid: [charge.workOrderItem].filter(isNonNullable).filter(hasPropertyValue('type', 'product'))[0]
        ?.uuid,
      workOrderCustomItemUuid: [charge.workOrderItem]
        .filter(isNonNullable)
        .filter(hasPropertyValue('type', 'custom-item'))[0]?.uuid,
      shopifyOrderLineItemId: currentFixedPriceChargeByUuid[charge.uuid]?.shopifyOrderLineItemId ?? null,
      uuid: charge.uuid,
      amountLocked: charge.amountLocked,
      removeLocked: charge.removeLocked,
    }));

  await Promise.all([
    hourlyLabourCharges.length ? db.workOrderCharges.upsertHourlyLabourCharges({ charges: hourlyLabourCharges }) : null,

    fixedPriceLabourCharges.length
      ? db.workOrderCharges.upsertFixedPriceLabourCharges({ charges: fixedPriceLabourCharges })
      : null,
  ]);
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
