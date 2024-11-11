import { Session } from '@shopify/shopify-api';
import { db } from '../db/db.js';
import { getNewWorkOrderName } from '../id-formatting.js';
import { unit } from '../db/unit-of-work.js';
import { CreateWorkOrder } from '../../schemas/generated/create-work-order.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { validateCreateWorkOrder } from './validate.js';
import { syncWorkOrder } from './sync.js';
import { hasNestedPropertyValue, hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { IGetItemsResult } from '../db/queries/generated/work-order.sql.js';
import { cleanOrphanedDraftOrders } from './clean-orphaned-draft-orders.js';
import { ensureCustomersExist } from '../customer/sync.js';
import { ensureShopifyOrdersExist } from '../shopify-order/sync.js';
import { ensureProductVariantsExist } from '../product-variants/sync.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { ensureStaffMembersExist } from '../staff-members/sync.js';
import { LocalsTeifiUser } from '../../decorators/permission.js';
import {
  getWorkOrder,
  getWorkOrderCharges,
  getWorkOrderItems,
  insertWorkOrderCustomFields,
  insertWorkOrderItemCustomFields,
  removeWorkOrderCharges,
  removeWorkOrderCustomFields,
  removeWorkOrderItemCustomFields,
  removeWorkOrderItems,
  upsertWorkOrderCharges,
  upsertWorkOrderItems,
} from './queries.js';
import { match, P } from 'ts-pattern';
import { identity } from '@teifi-digital/shopify-app-toolbox/functional';
import { UUID } from '@work-orders/common/util/uuid.js';
import { getSerial } from '../serials/queries.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { assertLocationsPermitted } from '../franchises/assert-locations-permitted.js';

// TODO: Support deleted customer/company
// TODO: Handle case where special order/ purchase order items are deleted

export async function upsertWorkOrder(session: Session, user: LocalsTeifiUser, createWorkOrder: CreateWorkOrder) {
  if (!createWorkOrder.locationId) {
    throw new HttpError('Location is required', 400);
  }

  await assertLocationsPermitted({
    shop: session.shop,
    locationIds: [createWorkOrder.locationId],
    staffMemberId: user.staffMember.id,
  });

  await validateCreateWorkOrder(session, createWorkOrder, user);

  if (createWorkOrder.name === null) {
    return await createNewWorkOrder(
      session,
      {
        ...createWorkOrder,
        name: createWorkOrder.name,
        locationId: createWorkOrder.locationId,
      },
      user.user.allowedLocationIds,
    );
  }

  return await updateWorkOrder(
    session,
    {
      ...createWorkOrder,
      name: createWorkOrder.name,
      locationId: createWorkOrder.locationId,
    },
    user.user.allowedLocationIds,
  );
}

async function createNewWorkOrder(
  session: Session,
  createWorkOrder: CreateWorkOrder & { name: null; locationId: ID },
  locationIds: ID[] | null,
) {
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
      locationId: createWorkOrder.locationId,
    });

    await upsertItems(session, createWorkOrder, workOrder.id, [], locationIds);
    await upsertCharges(session, createWorkOrder, workOrder.id, []);

    await Promise.all([
      insertWorkOrderCustomFields(workOrder.id, createWorkOrder.customFields),
      insertWorkOrderItemCustomFields(workOrder.id, createWorkOrder.items),
    ]);

    await syncWorkOrder(session, workOrder.id);

    return workOrder;
  });
}

async function updateWorkOrder(
  session: Session,
  createWorkOrder: CreateWorkOrder & { name: string; locationId: ID },
  locationIds: ID[] | null,
) {
  const workOrder = await getWorkOrder({ shop: session.shop, name: createWorkOrder.name, locationIds: null });

  if (!workOrder) {
    throw new HttpError('Work order not found', 404);
  }

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
        locationId: createWorkOrder.locationId,
      });

      const [currentItems, currentCharges] = await Promise.all([
        getWorkOrderItems(workOrderId),
        getWorkOrderCharges(workOrderId),
      ]);

      await Promise.all([removeWorkOrderCustomFields(workOrderId), removeWorkOrderItemCustomFields(workOrderId)]);

      await upsertItems(session, createWorkOrder, workOrderId, currentItems, locationIds);
      await upsertCharges(session, createWorkOrder, workOrderId, currentCharges);

      await deleteCharges(createWorkOrder, workOrderId, currentCharges);
      await deleteItems(createWorkOrder, workOrderId, currentItems);

      await Promise.all([
        insertWorkOrderCustomFields(workOrderId, createWorkOrder.customFields),
        insertWorkOrderItemCustomFields(workOrderId, createWorkOrder.items),
      ]);

      await syncWorkOrder(session, workOrderId);

      return workOrder;
    }),
  );
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
  currentItems: Awaited<ReturnType<typeof getWorkOrderItems>>,
  locationIds: ID[] | null,
) {
  const itemsByUuid = Object.fromEntries(currentItems.map(item => [item.uuid, item]));

  if (!createWorkOrder.items.length) {
    return;
  }

  const productItems = createWorkOrder.items.filter(hasPropertyValue('type', 'product'));
  const customItems = createWorkOrder.items.filter(hasPropertyValue('type', 'custom-item'));

  const [serials] = await Promise.all([
    Promise.all(
      [...productItems, ...customItems]
        .map(item => item.serial)
        .filter(isNonNullable)
        .map(serial =>
          getSerial({
            shop: session.shop,
            serial: serial.serial,
            productVariantId: serial.productVariantId,
            locationIds,
          }),
        ),
    ),
    ensureProductVariantsExist(session, unique(productItems.map(item => item.productVariantId))),
  ]);

  if (serials.includes(null)) {
    throw new HttpError('Serial not found', 400);
  }

  const getProductVariantSerialId = (serial: CreateWorkOrder['items'][number]['serial']) => {
    if (!serial) {
      return null;
    }

    return (
      serials
        .filter(hasNestedPropertyValue('serial', serial.serial))
        .find(hasPropertyValue('productVariantId', serial.productVariantId))?.id ?? null
    );
  };

  await Promise.all([
    upsertWorkOrderItems(
      productItems.map(({ productVariantId, absorbCharges, quantity, uuid, serial }) => ({
        shopifyOrderLineItemId: itemsByUuid[uuid]?.shopifyOrderLineItemId ?? null,
        workOrderId,
        uuid,
        productVariantSerialId: getProductVariantSerialId(serial),
        data: {
          type: 'product',
          absorbCharges,
          quantity,
          productVariantId,
        },
      })),
    ),
    upsertWorkOrderItems(
      customItems.map(({ name, unitPrice, absorbCharges, quantity, uuid, serial }) => ({
        shopifyOrderLineItemId: itemsByUuid[uuid]?.shopifyOrderLineItemId ?? null,
        workOrderId,
        uuid,
        productVariantSerialId: getProductVariantSerialId(serial),
        data: {
          type: 'custom-item',
          absorbCharges,
          quantity,
          name,
          unitPrice,
        },
      })),
    ),
  ]);
}

async function upsertCharges(
  session: Session,
  createWorkOrder: CreateWorkOrder,
  workOrderId: number,
  currentCharges: Awaited<ReturnType<typeof getWorkOrderCharges>>,
) {
  const employeeIds = unique(createWorkOrder.charges.map(charge => charge.employeeId).filter(isNonNullable));
  await ensureStaffMembersExist(session, employeeIds);

  const currentChargeByUuid = Object.fromEntries(currentCharges.map(charge => [charge.uuid, charge]));

  await upsertWorkOrderCharges(
    createWorkOrder.charges.map(charge => {
      const base = {
        employeeId: charge.employeeId,
        name: charge.name,
        removeLocked: charge.removeLocked,
      };

      return {
        workOrderId,
        uuid: charge.uuid,
        shopifyOrderLineItemId: currentChargeByUuid[charge.uuid]?.shopifyOrderLineItemId ?? null,
        workOrderItemUuid: charge.workOrderItemUuid,
        data: {
          ...base,
          ...match(charge)
            .with(
              {
                type: P.select('type', 'fixed-price-labour'),
                amount: P.select('amount'),
                amountLocked: P.select('amountLocked'),
              },
              identity,
            )
            .with(
              {
                type: P.select('type', 'hourly-labour'),
                rate: P.select('rate'),
                hours: P.select('hours'),
                rateLocked: P.select('rateLocked'),
                hoursLocked: P.select('hoursLocked'),
              },
              identity,
            )
            .exhaustive(),
        },
      };
    }),
  );
}

async function deleteItems(createWorkOrder: CreateWorkOrder, workOrderId: number, currentItems: IGetItemsResult[]) {
  const newItemUuids = new Set(createWorkOrder.items.map(item => item.uuid));
  const deletedItemUuids = currentItems.map(item => item.uuid as UUID).filter(uuid => !newItemUuids.has(uuid));

  await removeWorkOrderItems(workOrderId, deletedItemUuids);
}

async function deleteCharges(
  createWorkOrder: CreateWorkOrder,
  workOrderId: number,
  currentCharges: Awaited<ReturnType<typeof getWorkOrderCharges>>,
) {
  const newChargeUuids = new Set(createWorkOrder.charges.map(charge => charge.uuid));
  const deletedChargeUuids = currentCharges.map(charge => charge.uuid).filter(uuid => !newChargeUuids.has(uuid));

  await removeWorkOrderCharges(workOrderId, deletedChargeUuids);
}
