import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import type { Order, OrderInfo } from './types.js';
import type { ID } from '../gql/queries/generated/schema.js';
import type { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import { gql } from '../gql/gql.js';
import { db } from '../db/db.js';
import { decimalToMoney } from '../../util/decimal.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';

export async function getOrder(session: Session, id: ID): Promise<Order | null> {
  const graphql = new Graphql(session);

  const [{ order }, relatedWorkOrders] = await Promise.all([
    gql.order.get.run(graphql, { id }),
    db.shopifyOrder.getRelatedWorkOrdersByShopifyOrderId({ orderId: id }),
  ]);

  if (!order) {
    return null;
  }

  return {
    id,
    name: order.name,
    note: order.note,
    total: decimalToMoney(order.currentTotalPriceSet.shopMoney.amount),
    displayFulfillmentStatus: order.displayFulfillmentStatus,
    displayFinancialStatus: order.displayFinancialStatus,
    outstanding: decimalToMoney(order.totalOutstandingSet.shopMoney.amount),
    received: decimalToMoney(order.totalReceivedSet.shopMoney.amount),
    discount: decimalToMoney(order.totalDiscountsSet?.shopMoney?.amount ?? BigDecimal.ZERO.toDecimal()),
    tax: decimalToMoney(order.totalTaxSet?.shopMoney?.amount ?? BigDecimal.ZERO.toDecimal()),
    customer: order.customer,
    workOrders: relatedWorkOrders.map(({ name }) => ({ name })),
    customAttributes: order.customAttributes,
  };
}

export async function getOrderPage(
  session: Session,
  paginationOptions: PaginationOptions,
): Promise<{
  orders: OrderInfo[];
  pageInfo: {
    endCursor: string | null;
    hasNextPage: boolean;
  };
}> {
  const graphql = new Graphql(session);
  const {
    orders: { nodes, pageInfo },
  } = await gql.order.getPage.run(graphql, paginationOptions);

  return {
    pageInfo,
    orders: await Promise.all(nodes.map(getOrderInfoFromFragment)),
  };
}

export async function getOrderLineItems(session: Session, id: ID, paginationOptions: PaginationOptions) {
  const graphql = new Graphql(session);
  const { order } = await gql.order.getLineItems.run(graphql, { id, ...paginationOptions });

  if (!order) {
    return null;
  }

  return {
    pageInfo: order.lineItems.pageInfo,
    lineItems: order.lineItems.nodes,
  };
}

async function getOrderInfoFromFragment(orderInfoFragment: gql.order.OrderInfoFragment.Result): Promise<OrderInfo> {
  const workOrders = await db.shopifyOrder.getRelatedWorkOrdersByShopifyOrderId({ orderId: orderInfoFragment.id });

  return {
    id: orderInfoFragment.id,
    workOrders: workOrders.map(({ name }) => ({ name })),
    name: orderInfoFragment.name,
    total: decimalToMoney(orderInfoFragment.currentTotalPriceSet.shopMoney.amount),
    received: decimalToMoney(orderInfoFragment.totalReceivedSet.shopMoney.amount),
    outstanding: decimalToMoney(orderInfoFragment.totalOutstandingSet.shopMoney.amount),
    displayFulfillmentStatus: orderInfoFragment.displayFulfillmentStatus,
    displayFinancialStatus: orderInfoFragment.displayFinancialStatus,
    customer: orderInfoFragment.customer,
  };
}
