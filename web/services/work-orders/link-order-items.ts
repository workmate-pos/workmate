import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { getUuidFromCustomAttributeKey, WORK_ORDER_CUSTOM_ATTRIBUTE_NAME } from '@work-orders/work-order-shopify-order';
import { db } from '../db/db.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { Session } from '@shopify/shopify-api';
import { cleanOrphanedDraftOrders } from './clean-orphaned-draft-orders.js';
import { gql } from '../gql/gql.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';

type Order = { id: ID; customAttributes: { key: string; value: string | null }[] };
type LineItem =
  | gql.draftOrder.DatabaseShopifyOrderLineItemFragment.Result
  | gql.order.DatabaseShopifyOrderLineItemFragment.Result;

export async function linkWorkOrderItemsAndChargesAndDeposits(session: Session, order: Order, lineItems: LineItem[]) {
  const workOrderName = order.customAttributes.find(({ key }) => key === WORK_ORDER_CUSTOM_ATTRIBUTE_NAME)?.value;

  if (!workOrderName) {
    return;
  }

  const [workOrder] = await db.workOrder.get({ name: workOrderName });

  if (!workOrder) {
    throw new Error(`Work order with name ${workOrderName} not found`);
  }

  const errors: unknown[] = [];

  await cleanOrphanedDraftOrders(session, workOrder.id, () =>
    Promise.all([
      linkItems(lineItems, workOrder.id).catch(error => errors.push(error)),
      linkHourlyLabourCharges(lineItems, workOrder.id).catch(error => errors.push(error)),
      linkFixedPriceLabourCharges(lineItems, workOrder.id).catch(error => errors.push(error)),
      linkDeposits(lineItems, workOrder.id).catch(error => errors.push(error)),
    ]),
  );

  if (errors.length) {
    throw new AggregateError(errors, 'Failed to link work order items and charges');
  }
}

async function linkItems(lineItems: LineItem[], workOrderId: number) {
  const lineItemIdByItemUuid = getLineItemIdsByUuids(lineItems, 'item');

  const uuids = Object.keys(lineItemIdByItemUuid);

  const items = uuids.length ? await db.workOrder.getItemsByUuids({ workOrderId, uuids }) : [];
  for (const { uuid } of items) {
    const shopifyOrderLineItemId = lineItemIdByItemUuid[uuid] ?? never();
    await db.workOrder.setItemShopifyOrderLineItemId({ workOrderId, uuid, shopifyOrderLineItemId });

    // in case this line item is in some purchase order we transfer the line item id to the new order, make sure to update it there as well (e.g. when draft order becomes a real order).
    // we only support this behavior for work orders, and not for arbitrary draft orders since mapping from draft order line items to order line items is hard to do perfectly.
    for (const { purchaseOrderId, uuid } of await db.purchaseOrder.getPurchaseOrderLineItemsByShopifyOrderLineItemId({
      shopifyOrderLineItemId,
    })) {
      await db.purchaseOrder.setLineItemShopifyOrderLineItemId({ purchaseOrderId, uuid, shopifyOrderLineItemId });
    }
  }

  if (items.length !== uuids.length) {
    throw new Error('Did not find all item uuids from a Shopify Order in the database');
  }
}

async function linkHourlyLabourCharges(lineItems: LineItem[], workOrderId: number) {
  const lineItemIdByHourlyChargeUuid = getLineItemIdsByUuids(lineItems, 'hourly');

  const uuids = Object.keys(lineItemIdByHourlyChargeUuid);

  const charges = uuids.length ? await db.workOrderCharges.getHourlyLabourChargesByUuids({ workOrderId, uuids }) : [];
  for (const { uuid } of charges) {
    const shopifyOrderLineItemId = lineItemIdByHourlyChargeUuid[uuid] ?? never();
    await db.workOrderCharges.setHourlyLabourChargeShopifyOrderLineItemId({
      workOrderId,
      uuid,
      shopifyOrderLineItemId,
    });
  }

  if (charges.length !== uuids.length) {
    throw new Error('Did not find all hourly labour charge uuids from a Shopify Order in the database');
  }
}

async function linkFixedPriceLabourCharges(lineItems: LineItem[], workOrderId: number) {
  const lineItemIdByFixedPriceChargeUuid = getLineItemIdsByUuids(lineItems, 'fixed');

  const uuids = Object.keys(lineItemIdByFixedPriceChargeUuid);

  const charges = uuids.length
    ? await db.workOrderCharges.getFixedPriceLabourChargesByUuids({ workOrderId, uuids })
    : [];

  for (const { uuid } of charges) {
    const shopifyOrderLineItemId = lineItemIdByFixedPriceChargeUuid[uuid] ?? never();
    await db.workOrderCharges.setFixedPriceLabourChargeShopifyOrderLineItemId({
      workOrderId,
      uuid,
      shopifyOrderLineItemId,
    });
  }

  if (charges.length !== uuids.length) {
    throw new Error('Did not find all fixed price labour charge uuids from a Shopify Order in the database');
  }
}

async function linkDeposits(lineItems: LineItem[], workOrderId: number) {
  const lineItemIdByDepositUuid = getLineItemIdsByUuids(lineItems, 'deposit');

  for (const [uuid, shopifyOrderLineItemId] of Object.entries(lineItemIdByDepositUuid)) {
    const lineItem = lineItems.find(li => li.id === shopifyOrderLineItemId) ?? never();
    await db.workOrder.upsertDeposit({
      workOrderId,
      uuid,
      shopifyOrderLineItemId,
      amount: BigDecimal.fromDecimal(lineItem.discountedUnitPriceSet.shopMoney.amount)
        .multiply(BigDecimal.fromString(lineItem.quantity.toFixed(0)))
        .toMoney(),
    });
  }
}

export function getLineItemIdsByUuids(
  lineItems: Pick<LineItem, 'id' | 'customAttributes'>[],
  type: NonNullable<ReturnType<typeof getUuidFromCustomAttributeKey>>['type'],
): Record<string, ID> {
  const lineItemIdByUuid: Record<string, ID> = {};

  for (const { id, customAttributes } of lineItems) {
    for (const { key } of customAttributes) {
      const uuid = getUuidFromCustomAttributeKey(key);

      if (uuid && uuid.type === type) {
        lineItemIdByUuid[uuid.uuid] = id;
      }
    }
  }

  return lineItemIdByUuid;
}
