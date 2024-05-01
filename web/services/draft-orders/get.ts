import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import type { ID } from '../gql/queries/generated/schema.js';
import type { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import { gql } from '../gql/gql.js';
import { db } from '../db/db.js';
import { decimalToMoney } from '../../util/decimal.js';
import { DraftOrder, DraftOrderInfo } from './types.js';

export async function getDraftOrder(session: Session, id: ID): Promise<DraftOrder | null> {
  const graphql = new Graphql(session);

  const [{ order }, relatedWorkOrders] = await Promise.all([
    gql.draftOrder.get.run(graphql, { id }),
    db.shopifyOrder.getRelatedWorkOrdersByShopifyOrderId({ orderId: id }),
  ]);

  if (!order) {
    return null;
  }

  return {
    id,
    name: order.name,
    note: order.note,
    total: decimalToMoney(order.totalPriceSet.shopMoney.amount),
    discount: decimalToMoney(order.totalDiscountsSet.shopMoney.amount),
    tax: decimalToMoney(order.totalTaxSet.shopMoney.amount),
    customer: order.customer,
    workOrders: relatedWorkOrders.map(({ name }) => ({ name })),
  };
}

export async function getDraftOrderPage(
  session: Session,
  paginationOptions: PaginationOptions,
): Promise<{
  orders: DraftOrderInfo[];
  pageInfo: {
    endCursor: string | null;
    hasNextPage: boolean;
  };
}> {
  const graphql = new Graphql(session);
  const {
    draftOrders: { nodes, pageInfo },
  } = await gql.draftOrder.getPage.run(graphql, paginationOptions);

  return {
    pageInfo,
    orders: await Promise.all(nodes.map(getDraftOrderInfoFromFragment)),
  };
}

export async function getDraftOrderLineItems(session: Session, id: ID, paginationOptions: PaginationOptions) {
  const graphql = new Graphql(session);
  const { order } = await gql.draftOrder.getLineItems.run(graphql, { id, ...paginationOptions });

  if (!order) {
    return null;
  }

  return {
    pageInfo: order.lineItems.pageInfo,
    lineItems: order.lineItems.nodes,
  };
}

export async function getDraftOrderInfoFromFragment(
  orderInfoFragment: gql.draftOrder.DraftOrderInfoFragment.Result,
): Promise<DraftOrderInfo> {
  const workOrders = await db.shopifyOrder.getRelatedWorkOrdersByShopifyOrderId({ orderId: orderInfoFragment.id });

  return {
    id: orderInfoFragment.id,
    workOrders: workOrders.map(({ name }) => ({ name })),
    name: orderInfoFragment.name,
    total: decimalToMoney(orderInfoFragment.totalPriceSet.shopMoney.amount),
    customer: orderInfoFragment.customer,
  };
}
