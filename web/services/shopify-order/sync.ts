import { assertGid, ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { db } from '../db/db.js';
import { fetchAllPages, gql } from '../gql/gql.js';
import { Session } from '@shopify/shopify-api';
import { Graphql, sentryErr } from '@teifi-digital/shopify-app-express/services';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { ensureProductVariantsExist } from '../product-variants/sync.js';
import { syncWorkOrders } from '../work-orders/sync.js';
import { linkWorkOrderItemsAndChargesAndDeposits } from '../work-orders/link-order-items.js';
import { ensureCustomersExist } from '../customer/sync.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { unit } from '../db/unit-of-work.js';
import { compareMoney, subtractMoney, ZERO_MONEY } from '../../util/money.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { getWorkOrderDiscount } from '../work-orders/get.js';
import { removeShopifyOrderLineItemsExceptIds } from '../orders/queries.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { sql } from '../db/sql-tag.js';

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
  const {
    id: orderId,
    name,
    currentTotalPriceSet,
    currentSubtotalPriceSet,
    currentCartDiscountAmountSet,
    totalOutstandingSet,
    fullyPaid,
  } = order;

  if (order.customer) {
    await ensureCustomersExist(session, [order.customer.id]);
  }

  await unit(async () => {
    const [existingOrder] = await db.shopifyOrder.get({ orderId });

    await db.shopifyOrder.upsert({
      shop: session.shop,
      orderId,
      name,
      orderType: 'ORDER',
      customerId: order.customer?.id ?? null,
      outstanding: totalOutstandingSet.shopMoney.amount,
      subtotal: currentSubtotalPriceSet.shopMoney.amount,
      discount: currentCartDiscountAmountSet.shopMoney.amount,
      total: currentTotalPriceSet.shopMoney.amount,
      fullyPaid,
    });
    await syncShopifyOrderLineItems(session, { type: 'order', order, isNewOrder: !existingOrder });
  });
}

async function upsertDraftOrder(session: Session, draftOrder: gql.draftOrder.DatabaseShopifyOrderFragment.Result) {
  const { id: orderId, name, subtotalPriceSet, appliedDiscount, totalPriceSet } = draftOrder;

  if (draftOrder.customer) {
    await ensureCustomersExist(session, [draftOrder.customer.id]);
  }

  await unit(async () => {
    await db.shopifyOrder.upsert({
      shop: session.shop,
      orderId,
      name,
      orderType: 'DRAFT_ORDER',
      customerId: draftOrder.customer?.id ?? null,
      outstanding: totalPriceSet.shopMoney.amount,
      subtotal: subtotalPriceSet.shopMoney.amount,
      discount: appliedDiscount?.amountSet?.shopMoney?.amount ?? ZERO_MONEY,
      total: totalPriceSet.shopMoney.amount,
      fullyPaid: false,
    });
    await syncShopifyOrderLineItems(session, { type: 'draft-order', order: draftOrder });
  });
}

async function syncShopifyOrderLineItems(
  session: Session,
  order:
    | { type: 'order'; order: gql.order.DatabaseShopifyOrderFragment.Result; isNewOrder: boolean }
    | { type: 'draft-order'; order: gql.draftOrder.DatabaseShopifyOrderFragment.Result },
) {
  const lineItems =
    order.type === 'order'
      ? await getOrderLineItems(session, order.order.id)
      : await getDraftOrderLineItems(session, order.order.id);

  await ensureProductVariantsExist(
    session,
    unique(lineItems.map(lineItem => lineItem.variant?.id).filter(isNonNullable)),
  );

  await Promise.all(
    lineItems.map(
      async ({
        id: lineItemId,
        title,
        quantity,
        variant,
        unfulfilledQuantity,
        taxLines,
        discountedUnitPriceSet,
        originalUnitPriceSet,
      }) => {
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
          discountedUnitPrice: discountedUnitPriceSet.shopMoney.amount,
          totalTax,
        });
      },
    ),
  );

  // We should link work order items and work order charges if referenced
  try {
    await linkWorkOrderItemsAndChargesAndDeposits(session, order.order, lineItems);
  } catch (error) {
    sentryErr(error, {});
  }

  console.log('removing all except', lineItems);

  console.log(
    'removing:',
    await sql<{
      lineItemId: string;
      orderId: string;
      productVariantId: string | null;
      title: string;
      quantity: number;
      unfulfilledQuantity: number;
      discountedUnitPrice: string;
      unitPrice: string;
      totalTax: string;
      createdAt: Date;
      updatedAt: Date;
    }>`
    SELECT *
    FROM "ShopifyOrderLineItem"
    WHERE "orderId" = ${order.order.id as string}
      AND "lineItemId" != ALL (${lineItems.map(lineItem => lineItem.id) as string[]} :: text[]);
  `,
  );

  await removeShopifyOrderLineItemsExceptIds(
    order.order.id,
    lineItems.map(lineItem => lineItem.id),
  );

  const workOrders = await db.shopifyOrder.getRelatedWorkOrdersByShopifyOrderId({ orderId: order.order.id });

  await Promise.all(
    workOrders.map(async ({ id }) => {
      if (order.type !== 'order') return;
      if (!order.isNewOrder) return;

      const orderDiscountAmount = BigDecimal.fromDecimal(
        order.order.currentCartDiscountAmountSet.shopMoney.amount,
      ).toMoney();

      if (compareMoney(orderDiscountAmount, ZERO_MONEY) === 0) return;

      // If this is a new order that has a discount, make sure to subtract it from the discount that the Work Order has

      const [workOrder = never('pk')] = await db.workOrder.getById({ id });
      const discount = getWorkOrderDiscount(workOrder);

      if (discount?.type !== 'FIXED_AMOUNT') return;

      const newDiscountAmount = subtractMoney(discount.value, orderDiscountAmount);

      if (compareMoney(newDiscountAmount, ZERO_MONEY) <= 0) {
        await db.workOrder.updateDiscount({ id, discountType: null, discountAmount: null });
      } else {
        await db.workOrder.updateDiscount({ id, discountType: 'FIXED_AMOUNT', discountAmount: newDiscountAmount });
      }
    }),
  );

  // sync work orders in case any line items now don't have a related line item anymore
  // can happen when a merchant deletes a draft order that we reference, or deletes a line item from an order
  await syncWorkOrders(
    session,
    workOrders.map(({ id }) => id),
    { onlySyncIfUnlinked: true, updateCustomAttributes: false },
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
