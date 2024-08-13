import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { getUuidFromCustomAttributeKey, WORK_ORDER_CUSTOM_ATTRIBUTE_NAME } from '@work-orders/work-order-shopify-order';
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
import { replacePurchaseOrderLineItemShopifyOrderLineItemIds } from '../purchase-orders/queries.js';
import { hasNonNullableProperty } from '@teifi-digital/shopify-app-toolbox/guards';
import { replaceStockTransferLineItemShopifyOrderLineItemIds } from '../stock-transfers/queries.js';

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
  const lineItemIdByItemUuid = getLineItemIdsByUuids(lineItems, 'item');

  const uuids = Object.keys(lineItemIdByItemUuid);

  const items = await getWorkOrderItemsByUuids({ workOrderId, uuids });

  const replacements = items
    .filter(hasNonNullableProperty('shopifyOrderLineItemId'))
    .map(({ uuid, shopifyOrderLineItemId }) => ({
      currentShopifyOrderLineItemId: shopifyOrderLineItemId,
      newShopifyOrderLineItemId: lineItemIdByItemUuid[uuid] ?? never(),
    }));

  await Promise.all([
    setWorkOrderItemShopifyOrderLineItemIds(
      workOrderId,
      items.map(({ uuid }) => ({ uuid, shopifyOrderLineItemId: lineItemIdByItemUuid[uuid] ?? never() })),
    ),

    // items may have been linked to a purchase order line item. if so, we should update the purchase order line item's shopifyOrderLineItemId too.
    replacePurchaseOrderLineItemShopifyOrderLineItemIds(replacements),

    // the same applies to transfer order line items
    replaceStockTransferLineItemShopifyOrderLineItemIds(replacements),
  ]);

  if (items.length !== uuids.length) {
    throw new Error('Did not find all item uuids from a Shopify Order in the database');
  }
}

async function linkCharges(lineItems: LineItem[], workOrderId: number) {
  const lineItemIdByChargeUuid = getLineItemIdsByUuids(lineItems, 'charge');

  const uuids = Object.keys(lineItemIdByChargeUuid);

  const charges = await getWorkOrderChargesByUuids({ workOrderId, uuids });
  await setWorkOrderChargeShopifyOrderLineItemIds(
    workOrderId,
    charges.map(({ uuid }) => ({ uuid, shopifyOrderLineItemId: lineItemIdByChargeUuid[uuid] ?? never() })),
  );

  if (charges.length !== uuids.length) {
    throw new Error('Charges and line items do not match');
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
