import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { getUuidFromCustomAttributeKey, WORK_ORDER_CUSTOM_ATTRIBUTE_NAME } from '@work-orders/work-order-shopify-order';
import { db } from '../db/db.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { Session } from '@shopify/shopify-api';
import { gql } from '../gql/gql.js';
import {
  getWorkOrder,
  getWorkOrderChargesByUuids,
  getWorkOrderItemsByUuids,
  setWorkOrderChargeShopifyOrderLineItemIds,
  setWorkOrderItemShopifyOrderLineItemIds,
} from './queries.js';

type Order = { id: ID; customAttributes: { key: string; value: string | null }[] };
type LineItem =
  | gql.draftOrder.DatabaseShopifyOrderLineItemFragment.Result
  | gql.order.DatabaseShopifyOrderLineItemFragment.Result;

export async function linkWorkOrderItemsAndChargesAndDeposits(session: Session, order: Order, lineItems: LineItem[]) {
  const workOrderName = order.customAttributes.find(({ key }) => key === WORK_ORDER_CUSTOM_ATTRIBUTE_NAME)?.value;

  if (!workOrderName) {
    return;
  }

  const workOrder = await getWorkOrder({ shop: session.shop, name: workOrderName });

  if (!workOrder) {
    throw new Error(`Work order with name ${workOrderName} not found`);
  }

  const errors: unknown[] = [];

  await Promise.all([
    linkItems(lineItems, workOrder.id).catch(error => errors.push(error)),
    linkCharges(lineItems, workOrder.id).catch(error => errors.push(error)),
  ]);

  if (errors.length) {
    throw new AggregateError(errors, 'Failed to link work order items and charges');
  }
}

async function linkItems(lineItems: LineItem[], workOrderId: number) {
  // TODO: Eventually get rid of this distinction
  const lineItemIdByItemUuid = getLineItemIdsByUuids(lineItems, 'item');

  const uuids = Object.keys(lineItemIdByItemUuid);

  const items = await getWorkOrderItemsByUuids({ workOrderId, uuids });
  // TODO: parallel
  for (const { uuid, shopifyOrderLineItemId: previousShopifyOrderLineItemId, data } of items) {
    const shopifyOrderLineItemId = lineItemIdByItemUuid[uuid] ?? never();
    await setWorkOrderItemShopifyOrderLineItemIds(workOrderId, [{ uuid, shopifyOrderLineItemId }]);

    if (data.type === 'product' && previousShopifyOrderLineItemId) {
      // if this work order item was previously linked to a different line item, we should also re-link purchase order line items.
      // this is handy when a draft order is converted to a real order/when a new draft order is created (e.g. when changing a work order)

      for (const { purchaseOrderId, uuid } of await db.purchaseOrder.getPurchaseOrderLineItemsByShopifyOrderLineItemId({
        shopifyOrderLineItemId: previousShopifyOrderLineItemId,
      })) {
        await db.purchaseOrder.setLineItemShopifyOrderLineItemId({
          purchaseOrderId,
          uuid,
          shopifyOrderLineItemId,
        });
      }
    }
  }

  if (items.length !== uuids.length) {
    throw new Error('Did not find all item uuids from a Shopify Order in the database');
  }
}

async function linkCharges(lineItems: LineItem[], workOrderId: number) {
  const lineItemByChargeUuid = getLineItemIdsByUuids(lineItems, 'charge');

  const uuids = Object.keys(lineItemByChargeUuid);

  const charges = await getWorkOrderChargesByUuids({ workOrderId, uuids });
  await setWorkOrderChargeShopifyOrderLineItemIds(
    workOrderId,
    charges.map(({ uuid }) => ({ uuid, shopifyOrderLineItemId: lineItemByChargeUuid[uuid] ?? never() })),
  );
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
