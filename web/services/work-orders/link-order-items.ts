import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { gql } from '../gql/gql.js';
import {
  FIXED_CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
  HOURLY_CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
  ITEM_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
  WORK_ORDER_CUSTOM_ATTRIBUTE_NAME,
} from '@work-orders/work-order-shopify-order';
import { db } from '../db/db.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { sentryErr } from '@teifi-digital/shopify-app-express/services/sentry.js';
import { Session } from '@shopify/shopify-api';
import { cleanOrphanedDraftOrders } from './clean-orphaned-draft-orders.js';

export async function linkWorkOrderItemsAndCharges(
  session: Session,
  order: gql.order.DatabaseShopifyOrderFragment.Result,
  lineItems: gql.order.DatabaseShopifyOrderLineItemFragment.Result[],
) {
  const workOrderName = order.customAttributes.find(({ key }) => key === WORK_ORDER_CUSTOM_ATTRIBUTE_NAME)?.value;

  if (!workOrderName) {
    return;
  }

  const [workOrder] = await db.workOrder.get({ name: workOrderName });

  if (!workOrder) {
    throw new Error(`Work order with name ${workOrderName} not found`);
  }

  await cleanOrphanedDraftOrders(session, workOrder.id, () =>
    Promise.all([
      linkItems(order.id, lineItems, workOrder.id),
      linkHourlyLabourCharges(order.id, lineItems, workOrder.id),
      linkFixedPriceLabourCharges(order.id, lineItems, workOrder.id),
    ]),
  );
}

async function linkItems(
  orderId: ID,
  lineItems: gql.order.DatabaseShopifyOrderLineItemFragment.Result[],
  workOrderId: number,
) {
  const lineItemIdByItemUuid: Record<string, ID> = getLineItemIdsByUuids(
    lineItems,
    ITEM_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
  );

  const uuids = Object.keys(lineItemIdByItemUuid);

  const items = await db.workOrder.getItemsByUuids({ workOrderId, uuids });
  for (const { uuid } of items) {
    const shopifyOrderLineItemId = lineItemIdByItemUuid[uuid] ?? never();
    await db.workOrder.setLineItemShopifyOrderLineItemId({ workOrderId, uuid, shopifyOrderLineItemId });

    // in case this line item is in some purchase order we transfer the line item id to the new order, make sure to update it there as well (e.g. when draft order becomes a real order).
    // we only support this behavior for work orders, and not for arbitrary draft orders since mapping from draft order line items to order line items is hard to do perfectly.
    for (const { id } of await db.purchaseOrder.getPurchaseOrderLineItemsByShopifyOrderLineItemId({
      shopifyOrderLineItemId,
    })) {
      await db.purchaseOrder.updateLineItem({ id, shopifyOrderLineItemId });
    }
  }

  if (items.length !== uuids.length) {
    sentryErr('Did not find all item uuids from a Shopify Order in the database', {
      id: orderId,
      orderUuids: uuids,
      databaseUuids: items.map(({ uuid }) => uuid),
    });
  }
}

async function linkHourlyLabourCharges(
  orderId: ID,
  lineItems: gql.order.DatabaseShopifyOrderLineItemFragment.Result[],
  workOrderId: number,
) {
  const lineItemIdByHourlyChargeUuid: Record<string, ID> = getLineItemIdsByUuids(
    lineItems,
    HOURLY_CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
  );

  const uuids = Object.keys(lineItemIdByHourlyChargeUuid);

  const charges = await db.workOrderCharges.getHourlyLabourChargesByUuids({ workOrderId, uuids });
  for (const { uuid } of charges) {
    const shopifyOrderLineItemId = lineItemIdByHourlyChargeUuid[uuid] ?? never();
    await db.workOrderCharges.setHourlyLabourChargeShopifyOrderLineItemId({
      workOrderId,
      uuid,
      shopifyOrderLineItemId,
    });
  }

  if (charges.length !== uuids.length) {
    sentryErr('Did not find all hourly labour charge uuids from a Shopify Order in the database', {
      id: orderId,
      orderUuids: uuids,
      databaseUuids: charges.map(({ uuid }) => uuid),
    });
  }
}

async function linkFixedPriceLabourCharges(
  orderId: ID,
  lineItems: gql.order.DatabaseShopifyOrderLineItemFragment.Result[],
  workOrderId: number,
) {
  const lineItemIdByFixedPriceChargeUuid: Record<string, ID> = getLineItemIdsByUuids(
    lineItems,
    FIXED_CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
  );

  const uuids = Object.keys(lineItemIdByFixedPriceChargeUuid);

  const charges = await db.workOrderCharges.getFixedPriceLabourChargesByUuids({ workOrderId, uuids });
  for (const { uuid } of charges) {
    const shopifyOrderLineItemId = lineItemIdByFixedPriceChargeUuid[uuid] ?? never();
    await db.workOrderCharges.setFixedPriceLabourChargeShopifyOrderLineItemId({
      workOrderId,
      uuid,
      shopifyOrderLineItemId,
    });
  }

  if (charges.length !== uuids.length) {
    sentryErr('Did not find all fixed price labour charge uuids from a Shopify Order in the database', {
      id: orderId,
      orderUuids: uuids,
      databaseUuids: charges.map(({ uuid }) => uuid),
    });
  }
}

function getLineItemIdsByUuids(
  lineItems: gql.order.DatabaseShopifyOrderLineItemFragment.Result[],
  uuidPrefix: string,
): Record<string, ID> {
  const lineItemIdByUuid: Record<string, ID> = {};

  for (const { id, customAttributes } of lineItems) {
    const uuid = customAttributes.find(({ key }) => key.startsWith(uuidPrefix))?.key?.slice(uuidPrefix.length);

    if (uuid !== undefined) {
      lineItemIdByUuid[uuid] = id;
    }
  }

  return lineItemIdByUuid;
}
