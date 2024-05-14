import { CreateWorkOrder } from '../../schemas/generated/create-work-order.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { assertValidUuid } from '../../util/uuid.js';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { indexBy } from '@teifi-digital/shopify-app-toolbox/array';
import { gql } from '../gql/gql.js';
import { db } from '../db/db.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { CalculateWorkOrder } from '../../schemas/generated/calculate-work-order.js';

export async function validateCreateWorkOrder(session: Session, createWorkOrder: CreateWorkOrder, superuser: boolean) {
  assertValidUuids(createWorkOrder);
  assertUniqueItemUuids(createWorkOrder);
  assertUniqueHourlyLabourChargeUuids(createWorkOrder);
  assertUniqueFixedPriceLabourChargeUuids(createWorkOrder);
  assertPositiveItemQuantities(createWorkOrder);
  assertValidChargeItemUuids(createWorkOrder);

  await assertValidWorkOrderName(session, createWorkOrder);
  await assertNonPaidWorkOrderItemProductsExist(session, createWorkOrder);
  await assertNoIllegalItemChanges(session, createWorkOrder);
  await assertNoIllegalHourlyChargeChanges(session, createWorkOrder, superuser);
  await assertNoIllegalFixedPriceChargeChanges(session, createWorkOrder, superuser);
}

export async function validateCalculateWorkOrder(
  session: Session,
  calculateWorkOrder: CalculateWorkOrder,
  superuser: boolean,
) {
  assertValidUuids(calculateWorkOrder);
  assertUniqueItemUuids(calculateWorkOrder);
  assertUniqueHourlyLabourChargeUuids(calculateWorkOrder);
  assertUniqueFixedPriceLabourChargeUuids(calculateWorkOrder);
  assertPositiveItemQuantities(calculateWorkOrder);
  assertValidChargeItemUuids(calculateWorkOrder);

  await assertValidWorkOrderName(session, calculateWorkOrder);
  await assertNoIllegalItemChanges(session, calculateWorkOrder);
  await assertNoIllegalHourlyChargeChanges(session, calculateWorkOrder, superuser);
  await assertNoIllegalFixedPriceChargeChanges(session, calculateWorkOrder, superuser);
}

function assertValidUuids(createWorkOrder: Pick<CreateWorkOrder, 'items' | 'charges'>) {
  for (const { uuid } of [...createWorkOrder.items, ...createWorkOrder.charges]) {
    assertValidUuid(uuid);
  }
}

function assertUniqueItemUuids(createWorkOrder: Pick<CreateWorkOrder, 'items'>) {
  const itemUuids = createWorkOrder.items.map(li => li.uuid);
  const itemUuidsSet = new Set(itemUuids);

  if (itemUuidsSet.size !== itemUuids.length) {
    throw new HttpError('Work order items must have unique uuids', 400);
  }
}

function assertUniqueHourlyLabourChargeUuids(createWorkOrder: Pick<CreateWorkOrder, 'charges'>) {
  const hourlyLabourChargeUuids = createWorkOrder.charges
    .filter(hasPropertyValue('type', 'hourly-labour'))
    .map(charge => charge.uuid);

  const hourlyLabourChargeUuidsSet = new Set(hourlyLabourChargeUuids);

  if (hourlyLabourChargeUuidsSet.size !== hourlyLabourChargeUuids.length) {
    throw new HttpError('Hourly labour charges must have unique uuids', 400);
  }
}

function assertUniqueFixedPriceLabourChargeUuids(createWorkOrder: Pick<CreateWorkOrder, 'charges'>) {
  const fixedPriceLabourChargeUuids = createWorkOrder.charges
    .filter(hasPropertyValue('type', 'fixed-price-labour'))
    .map(charge => charge.uuid);

  const fixedPriceLabourChargeUuidsSet = new Set(fixedPriceLabourChargeUuids);

  if (fixedPriceLabourChargeUuidsSet.size !== fixedPriceLabourChargeUuids.length) {
    throw new HttpError('Fixed price labour charges must have unique uuids', 400);
  }
}

function assertValidChargeItemUuids(createWorkOrder: Pick<CreateWorkOrder, 'items' | 'charges'>) {
  const itemUuids = createWorkOrder.items.map(item => item.uuid);
  const itemUuidsSet = new Set(itemUuids);

  for (const charge of createWorkOrder.charges) {
    if (charge.workOrderItemUuid !== null) {
      if (!itemUuidsSet.has(charge.workOrderItemUuid)) {
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

function assertPositiveItemQuantities(createWorkOrder: Pick<CreateWorkOrder, 'items'>) {
  for (const item of createWorkOrder.items) {
    if (item.quantity <= 0) {
      throw new HttpError(`Item quantity must be positive. Found ${item.quantity}`, 400);
    }
  }
}

async function assertValidWorkOrderName(session: Session, createWorkOrder: Pick<CreateWorkOrder, 'name'>) {
  if (createWorkOrder.name) {
    // if a name is provided it must already exist (deciding the name in the request is not allowed)

    const [workOrder] = await db.workOrder.get({ shop: session.shop, name: createWorkOrder.name });

    if (!workOrder) {
      throw new HttpError('Work order not found', 404);
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
) {
  const missingProductVariantIds = await getMissingNonPaidWorkOrderProduct(session, createWorkOrder);

  if (missingProductVariantIds.length > 0) {
    throw new HttpError('You must remove any invalid products from the work order', 400, {
      missingProductVariantIds,
    });
  }
}

export async function getMissingNonPaidWorkOrderProduct(
  session: Session,
  createWorkOrder: Pick<CreateWorkOrder, 'name' | 'items'>,
) {
  const graphql = new Graphql(session);

  const productVariantIds = new Set<ID>();

  if (createWorkOrder.name) {
    // if this work order already exists we should only check product variant ids that have not been paid for yet

    const [{ id: workOrderId } = never()] = await db.workOrder.get({ shop: session.shop, name: createWorkOrder.name });

    const uuids = createWorkOrder.items.map(li => li.uuid);
    const items = uuids.length ? await db.workOrder.getItemsByUuids({ workOrderId, uuids }) : [];
    const itemByUuid = indexBy(items, i => i.uuid);

    for (const { uuid, productVariantId } of createWorkOrder.items) {
      const shopifyOrderLineItemId = itemByUuid[uuid]?.shopifyOrderLineItemId;

      if (isLineItemId(shopifyOrderLineItemId)) {
        continue;
      }

      productVariantIds.add(productVariantId);
    }
  } else {
    for (const { productVariantId } of createWorkOrder.items) {
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

async function assertNoIllegalItemChanges(session: Session, createWorkOrder: Pick<CreateWorkOrder, 'name' | 'items'>) {
  if (!createWorkOrder.name) {
    return;
  }

  const [{ id: workOrderId } = never()] = await db.workOrder.get({ shop: session.shop, name: createWorkOrder.name });
  const currentItems = await db.workOrder.getItems({ workOrderId });

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

async function assertNoIllegalHourlyChargeChanges(
  session: Session,
  createWorkOrder: Pick<CreateWorkOrder, 'name' | 'items' | 'charges'>,
  superuser: boolean,
) {
  if (!createWorkOrder.name) {
    return;
  }

  const [{ id: workOrderId } = never()] = await db.workOrder.get({ shop: session.shop, name: createWorkOrder.name });
  const currentHourlyCharges = await db.workOrderCharges.getHourlyLabourCharges({ workOrderId });

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

    const newCharge = newHourlyChargesByUuid[oldCharge.uuid];

    if (!newCharge) {
      continue;
    }

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

async function assertNoIllegalFixedPriceChargeChanges(
  session: Session,
  createWorkOrder: Pick<CreateWorkOrder, 'name' | 'items' | 'charges'>,
  superuser: boolean,
) {
  if (!createWorkOrder.name) {
    return;
  }

  const [{ id: workOrderId } = never()] = await db.workOrder.get({ shop: session.shop, name: createWorkOrder.name });
  const currentFixedPriceCharges = await db.workOrderCharges.getFixedPriceLabourCharges({ workOrderId });

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

    const newCharge = newFixedPriceChargesByUuid[oldCharge.uuid];

    if (!newCharge) {
      continue;
    }

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

function isLineItemId(id?: string | null | undefined) {
  return typeof id === 'string' && parseGid(id).objectName === 'LineItem';
}
