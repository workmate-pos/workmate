import { assertGid, ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { db } from '../db/db.js';
import { fetchAllPages, gql } from '../gql/gql.js';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { transaction } from '../db/transaction.js';
import { ensureProductVariantsExist } from '../product-variants/sync.js';
import { syncWorkOrders } from '../work-orders/sync.js';
import { linkWorkOrderItemsAndCharges } from '../work-orders/link-order-items.js';
import { ensureCustomersExist } from '../customer/sync.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';

export async function ensureShopifyOrdersExist(session: Session, orderIds: ID[]) {
  if (orderIds.length === 0) {
    return;
  }

  const databaseShopifyOrders = await db.shopifyOrder.getMany({ orderIds });
  const existingShopifyOrderIds = new Set(databaseShopifyOrders.map(shopifyOrder => shopifyOrder.orderId));
  const missingShopifyOrderIds = orderIds.filter(orderId => !existingShopifyOrderIds.has(orderId));

  await syncShopifyOrders(session, missingShopifyOrderIds);
}

export async function syncShopifyOrdersIfExists(session: Session, orderIds: ID[]) {
  if (orderIds.length === 0) {
    return;
  }

  const databaseShopifyOrders = await db.shopifyOrder.getMany({ orderIds });
  const existingShopifyOrderIds = databaseShopifyOrders.map(shopifyOrder => {
    const orderId = shopifyOrder.orderId;
    assertGid(orderId);
    return orderId;
  });

  await syncShopifyOrders(session, existingShopifyOrderIds);
}

/**
 * Syncs the ShopifyOrder and ShopifyOrderLineItem tables with the given order/draft order ids
 */
export async function syncShopifyOrders(session: Session, ids: ID[]) {
  if (ids.length === 0) {
    return;
  }

  const draftOrderIds = ids.filter(id => parseGid(id).objectName === 'DraftOrder');
  const orderIds = ids.filter(id => parseGid(id).objectName === 'Order');

  const graphql = new Graphql(session);
  const [{ nodes: orderNodes }, { nodes: draftOrderNodes }] = await Promise.all([
    gql.order.getManyForDatabase.run(graphql, { ids: orderIds }),
    gql.draftOrder.getManyForDatabase.run(graphql, { ids: draftOrderIds }),
  ]);

  const orders = orderNodes.filter(isNonNullable).filter(hasPropertyValue('__typename', 'Order'));
  const draftOrders = draftOrderNodes.filter(isNonNullable).filter(hasPropertyValue('__typename', 'DraftOrder'));

  const errors: unknown[] = [];

  await Promise.all([
    ...orders.map(order => upsertOrder(session, order).catch(e => errors.push(e))),
    ...draftOrders.map(draftOrder => upsertDraftOrder(session, draftOrder).catch(e => errors.push(e))),
  ]);

  if (orders.length !== orderIds.length) {
    errors.push(new Error(`Some orders were not found (${orders.length}/${orderIds.length})`));
  }

  if (draftOrders.length !== draftOrderIds.length) {
    errors.push(new Error(`Some draft orders were not found (${draftOrders.length}/${draftOrderIds.length})`));
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to sync orders');
  }
}

async function upsertOrder(session: Session, order: gql.order.DatabaseShopifyOrderFragment.Result) {
  const { id: orderId, name, currentTotalPriceSet, totalOutstandingSet, fullyPaid } = order;

  if (order.customer) {
    await ensureCustomersExist(session, [order.customer.id]);
  }

  await transaction(async () => {
    await db.shopifyOrder.upsert({
      shop: session.shop,
      orderId,
      name,
      orderType: 'ORDER',
      customerId: order.customer?.id ?? null,
      outstanding: totalOutstandingSet.shopMoney.amount,
      total: currentTotalPriceSet.shopMoney.amount,
      fullyPaid,
    });
    await syncShopifyOrderLineItems(session, { type: 'order', order });
  });
}

async function upsertDraftOrder(session: Session, draftOrder: gql.draftOrder.DatabaseShopifyOrderFragment.Result) {
  const { id: orderId, name, totalPriceSet } = draftOrder;

  if (draftOrder.customer) {
    await ensureCustomersExist(session, [draftOrder.customer.id]);
  }

  await transaction(async () => {
    await db.shopifyOrder.upsert({
      shop: session.shop,
      orderId,
      name,
      orderType: 'DRAFT_ORDER',
      customerId: draftOrder.customer?.id ?? null,
      outstanding: totalPriceSet.shopMoney.amount,
      total: totalPriceSet.shopMoney.amount,
      fullyPaid: false,
    });
    await syncShopifyOrderLineItems(session, { type: 'draft-order', order: draftOrder });
  });
}

async function syncShopifyOrderLineItems(
  session: Session,
  order:
    | { type: 'order'; order: gql.order.DatabaseShopifyOrderFragment.Result }
    | { type: 'draft-order'; order: gql.draftOrder.DatabaseShopifyOrderFragment.Result },
) {
  const databaseLineItems = await db.shopifyOrder.getLineItems({ orderId: order.order.id });
  const databaseLineItemIds = databaseLineItems.map(lineItem => {
    const lineItemId = lineItem.lineItemId;
    assertGid(lineItemId);
    return lineItemId;
  });

  const lineItems =
    order.type === 'order'
      ? await getOrderLineItems(session, order.order.id)
      : await getDraftOrderLineItems(session, order.order.id);

  const lineItemIds = new Set(lineItems.map(lineItem => lineItem.id));
  const lineItemIdsToDelete = databaseLineItemIds.filter(lineItemId => !lineItemIds.has(lineItemId));

  const workOrders = await db.shopifyOrder.getRelatedWorkOrdersByShopifyOrderId({ orderId: order.order.id });

  if (lineItemIdsToDelete.length) {
    await db.shopifyOrder.removeLineItemsByIds({ lineItemIds: lineItemIdsToDelete });
  }

  for (const {
    id: lineItemId,
    title,
    quantity,
    variant,
    unfulfilledQuantity,
    taxLines,
    discountedPriceSet,
    originalUnitPriceSet,
  } of lineItems) {
    if (variant) {
      await ensureProductVariantsExist(session, [variant.id]);
    }

    const totalTax = BigDecimal.sum(
      ...taxLines.map(taxLine => BigDecimal.fromDecimal(taxLine.priceSet.shopMoney.amount)),
    ).toMoney();

    await db.shopifyOrder.upsertLineItem({
      lineItemId,
      orderId: order.order.id,
      productVariantId: variant?.id ?? null,
      quantity,
      title,
      unfulfilledQuantity,
      unitPrice: originalUnitPriceSet.shopMoney.amount,
      discountedUnitPrice: discountedPriceSet.shopMoney.amount,
      totalTax,
    });
  }

  // We should link work order items and work order charges if referenced
  await linkWorkOrderItemsAndCharges(session, order.order, lineItems);

  // sync work orders in case any line items now don't have a related line item anymore
  // can happen when a merchant deletes a draft order that we reference, or deletes a line item from an order
  await syncWorkOrders(
    session,
    workOrders.map(({ id }) => id),
    false,
  );
}

async function getOrderLineItems(session: Session, orderId: ID) {
  const graphql = new Graphql(session);

  return await fetchAllPages(
    graphql,
    (graphql, variables) => gql.order.getLineItemsForDatabase.run(graphql, { ...variables, orderId }),
    result => {
      if (!result.order) {
        throw new Error(`Order ${orderId} not found`);
      }

      return result.order.lineItems;
    },
  );
}

async function getDraftOrderLineItems(session: Session, draftOrderId: ID) {
  const graphql = new Graphql(session);

  const lineItems = await fetchAllPages(
    graphql,
    (graphql, variables) => gql.draftOrder.getLineItemsForDatabase.run(graphql, { ...variables, draftOrderId }),
    result => {
      if (!result.draftOrder) {
        throw new Error(`Draft Order ${draftOrderId} not found`);
      }

      return result.draftOrder.lineItems;
    },
  );

  return lineItems.map(lineItem => ({
    ...lineItem,
    unfulfilledQuantity: lineItem.quantity,
  }));
}
