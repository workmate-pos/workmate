import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
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

  // re-linking can cause draft orders to become orphaned, so track draft orders so we can delete the orphans
  const oldLinkedDraftOrders = await db.workOrder.getLinkedDraftOrderIds({ workOrderId: workOrder.id });

  await Promise.all([
    linkItems(order.id, lineItems, workOrder.id),
    linkHourlyLabourCharges(order.id, lineItems, workOrder.id),
    linkFixedPriceLabourCharges(order.id, lineItems, workOrder.id),
  ]);

  const newLinkedDraftOrders = await db.workOrder.getLinkedDraftOrderIds({ workOrderId: workOrder.id });
  const orphanedDraftOrders = oldLinkedDraftOrders.filter(
    ({ orderId }) => !newLinkedDraftOrders.some(({ orderId: id }) => id === orderId),
  );

  if (orphanedDraftOrders.length) {
    const graphql = new Graphql(session);
    await gql.draftOrder.removeMany.run(graphql, {
      ids: orphanedDraftOrders.map(({ orderId }) => {
        assertGid(orderId);
        return orderId;
      }),
    });
  }
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

    // TODO: If present, find the DraftOrderLineItem linked to the uuid currently. Then make sure to link the purchase order line items top the new shopifyorderlineitemid
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
