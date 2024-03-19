import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import type { Order, OrderInfo } from './types.js';
import type { ID } from '../gql/queries/generated/schema.js';
import type { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import { gql } from '../gql/gql.js';
import { db } from '../db/db.js';
import { decimalToMoney } from '../../util/decimal.js';

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
    total: order.totalPrice,
    displayFulfillmentStatus: order.displayFulfillmentStatus,
    displayFinancialStatus: order.displayFinancialStatus,
    outstanding: decimalToMoney(order.totalOutstandingSet.shopMoney.amount),
    received: order.totalReceived,
    discount: order.totalDiscounts,
    tax: order.totalTax,
    customer: order.customer,
    workOrders: relatedWorkOrders.map(({ name }) => ({ name })),
  };
}

export async function getOrderInfos(
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

export async function getOrderInfo(session: Session, id: ID) {
  const graphql = new Graphql(session);
  const { order } = await gql.order.getInfo.run(graphql, { id });

  if (!order) {
    return null;
  }

  return getOrderInfoFromFragment(order);
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
    total: orderInfoFragment.totalPrice,
    received: orderInfoFragment.totalReceived,
    outstanding: decimalToMoney(orderInfoFragment.totalOutstandingSet.shopMoney.amount),
    displayFulfillmentStatus: orderInfoFragment.displayFulfillmentStatus,
    displayFinancialStatus: orderInfoFragment.displayFinancialStatus,
    customer: orderInfoFragment.customer,
  };
}
