import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { moneyV2ToMoney } from '@work-orders/common/util/money.js';
import type { Order, OrderInfo } from './types.js';
import type { ID, Money } from '../gql/queries/generated/schema.js';
import type { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import { gql } from '../gql/gql.js';
import { db } from '../db/db.js';

export async function getOrder(session: Session, id: ID): Promise<Order | null> {
  const graphql = new Graphql(session);
  const [{ order }, [workOrder]] = await Promise.all([
    gql.order.get.run(graphql, { id }),
    db.workOrder.getByDraftOrderIdOrOrderId({ id }),
  ]);

  if (!order) {
    return null;
  }

  const NoMoney = '0.00' as Money;

  return {
    id,
    name: order.name,
    note: order.note,
    total: order.totalPrice,
    displayFulfillmentStatus: order.displayFulfillmentStatus,
    displayFinancialStatus: order.displayFinancialStatus,
    outstanding: moneyV2ToMoney(order.totalOutstandingSet.shopMoney),
    received: order.totalReceived,
    discount: order.totalDiscounts ?? NoMoney,
    tax: order.totalTax ?? NoMoney,
    customer: order.customer,
    workOrder: workOrder
      ? {
          name: workOrder.name,
        }
      : null,
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
  const [workOrder] = await db.workOrder.getByDraftOrderIdOrOrderId({ id: orderInfoFragment.id });

  return {
    id: orderInfoFragment.id,
    workOrderName: workOrder?.name ?? null,
    name: orderInfoFragment.name,
    total: orderInfoFragment.totalPrice,
    received: orderInfoFragment.totalReceived,
    outstanding: moneyV2ToMoney(orderInfoFragment.totalOutstandingSet.shopMoney),
    displayFulfillmentStatus: orderInfoFragment.displayFulfillmentStatus,
    displayFinancialStatus: orderInfoFragment.displayFinancialStatus,
    customer: orderInfoFragment.customer,
  };
}
