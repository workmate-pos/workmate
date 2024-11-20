import { CreateWorkOrder } from '../../schemas/generated/create-work-order.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { hasNestedPropertyValue, hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { assertValidUuid } from '../../util/uuid.js';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { indexBy } from '@teifi-digital/shopify-app-toolbox/array';
import { gql } from '../gql/gql.js';
import { db } from '../db/db.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { CalculateWorkOrder } from '../../schemas/generated/calculate-work-order.js';
import { getWorkOrder, getWorkOrderCharges, getWorkOrderItems, WorkOrder } from './queries.js';
import { LocalsTeifiUser } from '../../decorators/permission.js';
import { httpError } from '../../util/http-error.js';

export async function validateCreateWorkOrder(
  session: Session,
  createWorkOrder: CreateWorkOrder,
  user: LocalsTeifiUser,
) {
  assertValidUuids(createWorkOrder);
  assertUniqueUuids(createWorkOrder);
  assertPositiveItemQuantities(createWorkOrder);
  assertValidChargeItemUuids(createWorkOrder);
  assertValidCompanyDetails(createWorkOrder);
  assertValidSerials(createWorkOrder);

  const workOrder = createWorkOrder.name
    ? ((await getWorkOrder({
        shop: session.shop,
        name: createWorkOrder.name,
        locationIds: user.user.allowedLocationIds,
      })) ?? httpError('Work order not found', 404))
    : undefined;

  await assertNonPaidWorkOrderItemProductsExist(session, createWorkOrder, workOrder);
  await assertNoIllegalItemChanges(session, createWorkOrder, workOrder);
  await assertNoIllegalHourlyChargeChanges(createWorkOrder, workOrder, user);
  await assertNoIllegalFixedPriceChargeChanges(session, createWorkOrder, workOrder, user);
}

export async function validateCalculateWorkOrder(
  session: Session,
  calculateWorkOrder: CalculateWorkOrder,
  user: LocalsTeifiUser,
) {
  assertValidUuids(calculateWorkOrder);
  assertUniqueUuids(calculateWorkOrder);
  assertPositiveItemQuantities(calculateWorkOrder);
  assertValidChargeItemUuids(calculateWorkOrder);

  const workOrder = calculateWorkOrder.name
    ? ((await getWorkOrder({
        shop: session.shop,
        name: calculateWorkOrder.name,
        locationIds: user.user.allowedLocationIds,
      })) ?? httpError('Work order not found', 404))
    : undefined;

  await Promise.all([
    await assertNoIllegalItemChanges(session, calculateWorkOrder, workOrder),
    await assertNoIllegalHourlyChargeChanges(calculateWorkOrder, workOrder, user),
    await assertNoIllegalFixedPriceChargeChanges(session, calculateWorkOrder, workOrder, user),
  ]);
}

function assertValidUuids(createWorkOrder: Pick<CreateWorkOrder, 'items' | 'charges'>) {
  for (const { uuid } of [...createWorkOrder.items, ...createWorkOrder.charges]) {
    assertValidUuid(uuid);
  }
}

function assertUniqueUuids(createWorkOrder: Pick<CreateWorkOrder, 'items' | 'charges'>) {
  const itemUuids = createWorkOrder.items.map(li => li.uuid);
  const itemUuidsSet = new Set(itemUuids);

  if (itemUuidsSet.size !== itemUuids.length) {
    throw new HttpError('Work order items must have unique uuids', 400);
  }

  const chargeUuids = createWorkOrder.charges.map(charge => charge.uuid);
  const chargeUuidsSet = new Set(chargeUuids);

  if (chargeUuidsSet.size !== chargeUuids.length) {
    throw new HttpError('Work order charges must have unique uuids', 400);
  }
}

function assertValidChargeItemUuids(createWorkOrder: Pick<CreateWorkOrder, 'items' | 'charges'>) {
  for (const charge of createWorkOrder.charges) {
    if (charge.workOrderItemUuid !== null) {
      if (!createWorkOrder.items.some(hasPropertyValue('uuid', charge.workOrderItemUuid))) {
        throw new HttpError(`Charge references non-existent work order item ${charge.workOrderItemUuid}`, 400);
      }
    }

    if (charge.type === 'hourly-labour') {
      if (BigDecimal.fromDecimal(charge.hours).compare(BigDecimal.ZERO) < 0) {
        throw new HttpError(`Labour hours must be non-negative. Found ${charge.hours}`, 400);
      }

      if (BigDecimal.fromMoney(charge.rate).compare(BigDecimal.ZERO) < 0) {
        throw new HttpError(`Labour rate must be non-negative. Found ${charge.rate}`, 400);
      }
    } else if (charge.type === 'fixed-price-labour') {
      if (BigDecimal.fromMoney(charge.amount).compare(BigDecimal.ZERO) < 0) {
        throw new HttpError(`Labour cost must be non-negative. Found ${charge.amount}`, 400);
      }
    } else {
      return charge satisfies never;
    }
  }
}

function assertValidCompanyDetails(
  createWorkOrder: Pick<CreateWorkOrder, 'companyId' | 'companyLocationId' | 'companyContactId'>,
) {
  // Either all company fields or none are set

  const companyFields = [
    createWorkOrder.companyId,
    createWorkOrder.companyLocationId,
    createWorkOrder.companyContactId,
  ];

  if (companyFields.some(value => value === null)) {
    if (!companyFields.every(value => value === null)) {
      throw new HttpError('All company fields must be set', 400);
    }
  }
}

function assertValidSerials(createWorkOrder: Pick<CreateWorkOrder, 'items'>) {
  for (const item of createWorkOrder.items) {
    if (!item.serial) {
      continue;
    }

    // both cases will be allowed in the future to be able to link products to some serial.
    // for instance, you may want to link spare parts to a car vin, etc

    switch (item.type) {
      case 'product': {
        if (item.serial.productVariantId !== item.productVariantId) {
          throw new HttpError('Serial product variant ID does not match product variant ID', 400);
        }

        break;
      }

      case 'custom-item': {
        throw new HttpError('Custom items cannot have serial numbers', 400);
      }

      default:
        return item satisfies never;
    }
  }
}

function assertPositiveItemQuantities(createWorkOrder: Pick<CreateWorkOrder, 'items'>) {
  for (const item of createWorkOrder.items) {
    if (item.quantity <= 0) {
      throw new HttpError(`Item quantity must be positive. Found ${item.quantity}`, 400);
    }
  }
}

/**
 * Asserts that all product variants in some work order actually exist.
 * This check is not performed for items that are already linked to a real order, as these have been paid already.
 */
export async function assertNonPaidWorkOrderItemProductsExist(
  session: Session,
  createWorkOrder: Pick<CreateWorkOrder, 'name' | 'items'>,
  workOrder: WorkOrder | undefined,
) {
  const missingProductVariantIds = await getMissingNonPaidWorkOrderProduct(session, createWorkOrder, workOrder);

  if (missingProductVariantIds.length > 0) {
    throw new HttpError('You must remove any invalid products from the work order', 400, {
      missingProductVariantIds,
    });
  }
}

/**
 * Find all products in a CreateWorkOrder that has not been paid for. These are not allowed >:(
 */
export async function getMissingNonPaidWorkOrderProduct(
  session: Session,
  createWorkOrder: Pick<CreateWorkOrder, 'name' | 'items'>,
  workOrder: WorkOrder | undefined,
) {
  const graphql = new Graphql(session);

  const productVariantIds = new Set<ID>();

  const workOrderItems = createWorkOrder.items.filter(hasPropertyValue('type', 'product'));

  if (workOrder) {
    // if this work order already exists we should only check product variant ids that have not been paid for yet
    const workOrderId = workOrder.id;

    const uuids = createWorkOrder.items.map(li => li.uuid);
    const items = uuids.length ? await db.workOrder.getItemsByUuids({ workOrderId, uuids }) : [];
    const itemByUuid = indexBy(items, i => i.uuid);

    for (const { uuid, productVariantId } of workOrderItems) {
      const shopifyOrderLineItemId = itemByUuid[uuid]?.shopifyOrderLineItemId;

      if (isLineItemId(shopifyOrderLineItemId)) {
        continue;
      }

      productVariantIds.add(productVariantId);
    }
  } else {
    for (const { productVariantId } of workOrderItems) {
      productVariantIds.add(productVariantId);
    }
  }

  const { nodes } = await gql.nodes.getMany.run(graphql, { ids: [...productVariantIds] });
  const existingProductVariantIds = new Set(
    nodes
      .filter(isNonNullable)
      .filter(hasPropertyValue('__typename', 'ProductVariant'))
      .map(pv => pv.id),
  );

  const missingProductVariantIds = [...productVariantIds].filter(id => !existingProductVariantIds.has(id));
  return missingProductVariantIds;
}

async function assertNoIllegalItemChanges(
  session: Session,
  createWorkOrder: Pick<CreateWorkOrder, 'name' | 'items'>,
  workOrder: WorkOrder | undefined,
) {
  if (!workOrder) {
    return;
  }

  const workOrderId = workOrder.id;
  const currentItems = await getWorkOrderItems(workOrderId);

  const newItemsByUuid = Object.fromEntries(createWorkOrder.items.map(item => [item.uuid, item]));

  for (const currentItem of currentItems) {
    if (isLineItemId(currentItem.shopifyOrderLineItemId)) {
      if (!(currentItem.uuid in newItemsByUuid)) {
        throw new HttpError(`Cannot delete item ${currentItem.uuid} as it is connected to an order`, 400);
      }

      const newItem = newItemsByUuid[currentItem.uuid] ?? never();

      if (newItem.type !== currentItem.data.type) {
        throw new HttpError(`Cannot change type of item ${currentItem.uuid}`, 400);
      }

      if (
        newItem.type === 'product' &&
        currentItem.data.type === 'product' &&
        newItem.productVariantId !== currentItem.data.productVariantId
      ) {
        throw new HttpError(`Cannot change product variant of item ${currentItem.uuid}`, 400);
      }

      if (newItem.quantity !== currentItem.data.quantity) {
        throw new HttpError(`Cannot change quantity of item ${currentItem.uuid}`, 400);
      }
    }
  }
}

// TODO: Merge with fixed price labour
async function assertNoIllegalHourlyChargeChanges(
  createWorkOrder: Pick<CreateWorkOrder, 'name' | 'items' | 'charges'>,
  workOrder: WorkOrder | undefined,
  user: LocalsTeifiUser,
) {
  if (!workOrder) {
    return;
  }

  const workOrderId = workOrder.id;
  const currentHourlyCharges = await getWorkOrderCharges(workOrderId).then(charges =>
    charges.filter(hasNestedPropertyValue('data.type', 'hourly-labour')),
  );

  const newHourlyChargesByUuid = Object.fromEntries(
    createWorkOrder.charges.filter(hasPropertyValue('type', 'hourly-labour')).map(charge => [charge.uuid, charge]),
  );

  // TODO: New permission for this?
  const canUnlock = user.user.superuser;

  for (const oldCharge of currentHourlyCharges) {
    const isLineItem = isLineItemId(oldCharge.shopifyOrderLineItemId);

    if (isLineItem && !(oldCharge.uuid in newHourlyChargesByUuid)) {
      throw new HttpError(`Cannot delete hourly charge ${oldCharge.uuid} as it is connected to an order`, 400);
    }

    if (oldCharge.data.removeLocked && !canUnlock && !(oldCharge.uuid in newHourlyChargesByUuid)) {
      throw new HttpError(`Cannot remove hourly charge ${oldCharge.uuid} as it is locked`, 400);
    }

    const newCharge = newHourlyChargesByUuid[oldCharge.uuid];

    if (!newCharge) {
      continue;
    }

    if (isLineItem && newCharge.name !== oldCharge.data.name) {
      throw new HttpError(`Cannot change name of hourly charge ${newCharge.uuid}`, 400);
    }

    const rateIsLocked = oldCharge.data.rateLocked && !canUnlock;

    if ((isLineItem || rateIsLocked) && newCharge.rate !== oldCharge.data.rate) {
      throw new HttpError(`Cannot change rate of hourly charge ${newCharge.uuid}`, 400);
    }

    const hoursIsLocked = oldCharge.data.hoursLocked && !canUnlock;

    if ((isLineItem || hoursIsLocked) && newCharge.hours !== oldCharge.data.hours) {
      throw new HttpError(`Cannot change hours of hourly charge ${newCharge.uuid}`, 400);
    }

    const unlocksRateLock = oldCharge.data.rateLocked && !newCharge.rateLocked;

    if ((isLineItem && newCharge.rateLocked !== oldCharge.data.rateLocked) || (!canUnlock && unlocksRateLock)) {
      throw new HttpError(`Cannot change rate lock of hourly charge ${newCharge.uuid}`, 400);
    }

    const unlocksHoursLock = oldCharge.data.hoursLocked && !newCharge.hoursLocked;

    if ((isLineItem && newCharge.hoursLocked !== oldCharge.data.hoursLocked) || (!canUnlock && unlocksHoursLock)) {
      throw new HttpError(`Cannot change hours lock of hourly charge ${newCharge.uuid}`, 400);
    }

    const unlocksRemoveLock = oldCharge.data.removeLocked && !newCharge.removeLocked;

    if ((isLineItem && newCharge.removeLocked !== oldCharge.data.removeLocked) || (!canUnlock && unlocksRemoveLock)) {
      throw new HttpError(`Cannot change remove lock of hourly charge ${newCharge.uuid}`, 400);
    }
  }
}

async function assertNoIllegalFixedPriceChargeChanges(
  session: Session,
  createWorkOrder: Pick<CreateWorkOrder, 'name' | 'items' | 'charges'>,
  workOrder: WorkOrder | undefined,
  user: LocalsTeifiUser,
) {
  if (!workOrder) {
    return;
  }

  const workOrderId = workOrder.id;
  const currentFixedPriceCharges = await getWorkOrderCharges(workOrderId).then(charges =>
    charges.filter(hasNestedPropertyValue('data.type', 'fixed-price-labour')),
  );

  const newFixedPriceChargesByUuid = Object.fromEntries(
    createWorkOrder.charges.filter(hasPropertyValue('type', 'fixed-price-labour')).map(charge => [charge.uuid, charge]),
  );

  const canUnlock = user.user.superuser;

  for (const oldCharge of currentFixedPriceCharges) {
    const isLineItem = isLineItemId(oldCharge.shopifyOrderLineItemId);

    if (isLineItem && !(oldCharge.uuid in newFixedPriceChargesByUuid)) {
      throw new HttpError(`Cannot delete fixed price charge ${oldCharge.uuid} as it is connected to an order`, 400);
    }

    if (oldCharge.data.removeLocked && !canUnlock && !(oldCharge.uuid in newFixedPriceChargesByUuid)) {
      throw new HttpError(`Cannot remove fixed price charge ${oldCharge.uuid} as it is locked`, 400);
    }

    const newCharge = newFixedPriceChargesByUuid[oldCharge.uuid];

    if (!newCharge) {
      continue;
    }

    if (isLineItem && newCharge.name !== oldCharge.data.name) {
      throw new HttpError(`Cannot change name of fixed price charge ${newCharge.uuid}`, 400);
    }

    const amountIsLocked = oldCharge.data.amountLocked && !canUnlock;

    if ((isLineItem || amountIsLocked) && newCharge.amount !== oldCharge.data.amount) {
      throw new HttpError(`Cannot change amount of fixed price charge ${newCharge.uuid}`, 400);
    }

    const unlocksAmountLock = oldCharge.data.amountLocked && !newCharge.amountLocked;

    if ((isLineItem && newCharge.amountLocked !== oldCharge.data.amountLocked) || (!canUnlock && unlocksAmountLock)) {
      throw new HttpError(`Cannot change amount lock of fixed price charge ${newCharge.uuid}`, 400);
    }

    const unlocksRemoveLock = oldCharge.data.removeLocked && !newCharge.removeLocked;

    if ((isLineItem && newCharge.removeLocked !== oldCharge.data.removeLocked) || (!canUnlock && unlocksRemoveLock)) {
      throw new HttpError(`Cannot change remove lock of fixed price charge ${newCharge.uuid}`, 400);
    }
  }
}

function isLineItemId(id?: string | null | undefined) {
  return typeof id === 'string' && parseGid(id).objectName === 'LineItem';
}
