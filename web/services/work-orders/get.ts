import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { db } from '../db/db.js';
import { fetchAllPages, gql } from '../gql/gql.js';
import { DateTime, ID, Money } from '../gql/queries/generated/schema.js';
import { escapeLike } from '../db/like.js';
import type { WorkOrderPaginationOptions } from '../../schemas/generated/work-order-pagination-options.js';
import { LineItem, WorkOrder, WorkOrderInfo } from './types.js';
import { getOrderInfo } from '../orders/get.js';
import { getShopSettings } from '../settings.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { awaitNested } from '@teifi-digital/shopify-app-toolbox/promise';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { decimalToMoney } from '../../util/decimal.js';

export async function getWorkOrder(session: Session, name: string): Promise<WorkOrder | null> {
  const [[workOrder], { fixedServiceCollectionId, mutableServiceCollectionId }] = await Promise.all([
    db.workOrder.get({ shop: session.shop, name }),
    getShopSettings(session.shop),
  ]);

  if (!workOrder) {
    return null;
  }

  const { id: workOrderId } = workOrder;

  const graphql = new Graphql(session);

  const orderType = workOrder.orderId === null ? 'draft-order' : 'order';
  const { get, getLineItems } = orderType === 'draft-order' ? gql.draftOrder : gql.order;

  const orderId = (workOrder.orderId ?? workOrder.draftOrderId ?? never('Invalid work order state')) as ID;

  const { hourlyLabours, fixedPriceLabours, order, lineItems, derivedFromOrder } = await awaitNested({
    hourlyLabours: db.workOrderLabour.getHourlyLabours({ workOrderId }),
    fixedPriceLabours: db.workOrderLabour.getFixedPriceLabours({ workOrderId }),
    order: get.run(graphql, { id: orderId }).then(r => r.order ?? never('Invalid order id')),
    lineItems: fetchAllPages(
      graphql,
      (graphql, variables) =>
        getLineItems.run(graphql, {
          ...variables,
          id: orderId,
          mutableServiceCollectionId,
          fixedServiceCollectionId,
        }),
      result => result.order?.lineItems ?? never('Invalid order id'),
    ),
    derivedFromOrder: workOrder.derivedFromOrderId ? getOrderInfo(session, workOrder.derivedFromOrderId as ID) : null,
  });

  const discount =
    order.__typename === 'DraftOrder'
      ? order.appliedDiscount
        ? order.appliedDiscount.valueType === 'FIXED_AMOUNT'
          ? ({
              valueType: 'FIXED_AMOUNT',
              value: BigDecimal.fromString(order.appliedDiscount.value.toString(2)).toMoney(),
            } as const)
          : ({
              valueType: 'PERCENTAGE',
              value: BigDecimal.fromString(order.appliedDiscount.value.toString(2)).toDecimal(),
            } as const)
        : null
      : order.totalDiscounts
        ? ({
            valueType: 'FIXED_AMOUNT',
            value: BigDecimal.fromMoney(order.totalDiscounts).toMoney(),
          } as const)
        : null;

  return {
    name: workOrder.name,
    status: workOrder.status,
    customerId: workOrder.customerId as ID,
    description: order.note ?? '',
    dueDate: workOrder.dueDate.toISOString() as DateTime,
    derivedFromOrder,
    labour: [
      ...hourlyLabours.map(
        ({ name, hours, rate, lineItemUuid, productVariantId, employeeId }) =>
          ({
            type: 'hourly-labour',
            hours: BigDecimal.fromString(hours).toDecimal(),
            rate: BigDecimal.fromString(rate).toMoney(),
            productVariantId: productVariantId as ID,
            employeeId: employeeId as ID,
            lineItemUuid,
            name,
          }) as const,
      ),
      ...fixedPriceLabours.map(
        ({ name, productVariantId, lineItemUuid, employeeId, amount }) =>
          ({
            type: 'fixed-price-labour',
            amount: BigDecimal.fromString(amount).toMoney(),
            productVariantId: productVariantId as ID,
            employeeId: employeeId as ID,
            lineItemUuid,
            name,
          }) as const,
      ),
    ],
    order: {
      type: orderType,
      id: orderId,
      name: order.name,
      discount,
      total: order.totalPrice,
      outstanding:
        order.__typename === 'Order' ? decimalToMoney(order.totalOutstandingSet.shopMoney.amount) : order.totalPrice,
      received: order.__typename === 'Order' ? order.totalReceived : ('0.00' as Money),
      lineItems: lineItems.map(
        ({ id, title, taxable, quantity, sku, variant, originalUnitPrice }): LineItem => ({
          id,
          title,
          taxable,
          quantity,
          sku,
          unitPrice: originalUnitPrice,
          variant: variant
            ? {
                id: variant.id,
                image: variant.image ? { url: variant.image.url } : null,
                product: {
                  id: variant.product.id,
                  title: variant.product.title,
                  isFixedServiceItem: variant.product.isFixedServiceItem,
                  isMutableServiceItem: variant.product.isMutableServiceItem,
                },
                title: variant.title,
              }
            : null,
        }),
      ),
    },
  };
}

/**
 * Fetches a page of work orders from the database + the corresponding (draft) orders from Shopify.
 * Loads only basic data to display in a list, such as the price and status.
 */
export async function getWorkOrderInfoPage(
  session: Session,
  paginationOptions: WorkOrderPaginationOptions,
): Promise<WorkOrderInfo[]> {
  if (paginationOptions.query) {
    paginationOptions.query = `%${escapeLike(paginationOptions.query)}%`;
  }

  const page = await db.workOrder.getPage({
    shop: session.shop,
    status: paginationOptions.status,
    offset: paginationOptions.offset,
    limit: paginationOptions.limit,
    query: paginationOptions.query,
    employeeIds: paginationOptions.employeeIds,
    customerId: paginationOptions.customerId,
  });

  const graphql = new Graphql(session);
  const orderIds = page.map(r => r.orderId ?? r.draftOrderId ?? never()) as ID[];
  const { nodes: orders } = await gql.order.getManyOrderInfoDraftOrderInfo.run(graphql, { ids: orderIds });

  return page.map((workOrder, i): WorkOrderInfo => {
    const order = orders[i] ?? never('Incorrect order id');

    if (order.__typename !== 'Order' && order.__typename !== 'DraftOrder') {
      throw new Error('Invalid order type');
    }

    const outstanding =
      order.__typename === 'Order' ? decimalToMoney(order.totalOutstandingSet.shopMoney.amount) : order.totalPrice;

    const financialStatus = order.__typename === 'Order' ? order.displayFinancialStatus : null;

    return {
      name: workOrder.name,
      status: workOrder.status,
      dueDate: workOrder.dueDate.toISOString() as DateTime,
      customerId: workOrder.customerId as ID,
      order: {
        name: order.name,
        total: order.totalPrice,
        outstanding,
        financialStatus,
      },
    };
  });
}
