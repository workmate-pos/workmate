import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { db } from '../db/db.js';
import { never } from '@work-orders/common/util/never.js';
import { fetchAllPages, gql } from '../gql/gql.js';
import { DateTime, ID, Int, Money } from '../gql/queries/generated/schema.js';
import { escapeLike } from '../db/like.js';
import type { WorkOrderPaginationOptions } from '../../schemas/generated/work-order-pagination-options.js';
import { LineItem, WorkOrder, WorkOrderInfo } from './types.js';
import { Cents, moneyV2ToMoney, parseMoney } from '@work-orders/common/util/money.js';
import { getOrderInfo } from '../orders/get.js';
import { awaitNested } from '../../util/promise.js';
import { PlaceholderLineItemAttribute } from '@work-orders/common/custom-attributes/attributes/PlaceholderLineItemAttribute.js';
import { findSoleTruth } from '../../util/choice.js';
import { getShopSettings } from '../settings.js';
import { LabourLineItemUuidAttribute } from '@work-orders/common/custom-attributes/attributes/LabourLineItemUuidAttribute.js';
import { SkuAttribute } from '@work-orders/common/custom-attributes/attributes/SkuAttribute.js';
import { UuidAttribute } from '@work-orders/common/custom-attributes/attributes/UuidAttribute.js';
import { groupBy } from '../../util/array.js';

export async function getWorkOrder(session: Session, name: string): Promise<WorkOrder | null> {
  const [[workOrder], employeeAssignments, settings] = await Promise.all([
    db.workOrder.get({ shop: session.shop, name }),
    db.employeeAssignment.getMany({ shop: session.shop, name }),
    getShopSettings(session.shop),
  ]);

  if (!workOrder) {
    return null;
  }

  const graphql = new Graphql(session);

  const orderType = findSoleTruth({
    order: workOrder.orderId !== null,
    'draft-order': workOrder.orderId === null,
  });

  const { get, getLineItems } = orderType === 'order' ? gql.order : gql.draftOrder;

  const orderId = (workOrder.orderId ?? workOrder.draftOrderId ?? never('Invalid work order state')) as ID;
  const order = await get.run(graphql, { id: orderId }).then(r => r.order ?? never('Invalid order id'));

  const { lineItems, derivedFromOrder } = await awaitNested({
    lineItems: fetchAllPages(
      graphql,
      (graphql, variables) =>
        getLineItems.run(graphql, { ...variables, id: orderId, serviceCollectionId: settings.serviceCollectionId }),
      result => result.order?.lineItems ?? never('Invalid order id'),
    ),
    derivedFromOrder: workOrder.derivedFromOrderId ? getOrderInfo(session, workOrder.derivedFromOrderId as ID) : null,
  });

  const discount =
    order.__typename === 'DraftOrder'
      ? order.appliedDiscount
      : order.totalDiscounts
        ? ({
            value: parseMoney(order.totalDiscounts),
            valueType: 'FIXED_AMOUNT',
          } as const)
        : null;

  const employeeAssignmentsByProductVariantId = groupBy(
    employeeAssignments.filter((ea): ea is typeof ea & { productVariantId: string } => !!ea.productVariantId),
    assignment => assignment.productVariantId,
  );

  return {
    name: workOrder.name,
    status: workOrder.status,
    customerId: workOrder.customerId as ID,
    description: order.note ?? '',
    dueDate: workOrder.dueDate.toISOString() as DateTime,
    derivedFromOrder,
    employeeAssignments: employeeAssignments.map(assignment => ({
      productVariantId: assignment.productVariantId as ID,
      employeeId: assignment.employeeId as ID,
      hours: assignment.hours as Int,
      rate: assignment.rate as Cents,
      lineItemUuid: assignment.lineItemUuid,
    })),
    order: {
      type: orderType,
      id: orderId,
      name: order.name,
      discount,
      total: order.totalPrice,
      outstanding:
        order.__typename === 'Order' ? moneyV2ToMoney(order.totalOutstandingSet.shopMoney) : order.totalPrice,
      received: order.__typename === 'Order' ? order.totalReceived : ('0.00' as Money),
      lineItems: lineItems.flatMap(
        ({ id, title, taxable, quantity, customAttributes, sku, variant, originalUnitPrice }): LineItem[] => {
          const lineItemObj: WorkOrder['order']['lineItems'][number] = {
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
                  product: { id: variant.product.id, title: variant.product.title },
                  title: variant.title,
                }
              : null,
            attributes: {
              labourLineItemUuid: LabourLineItemUuidAttribute.findAttribute(customAttributes),
              placeholderLineItem: PlaceholderLineItemAttribute.findAttribute(customAttributes),
              sku: SkuAttribute.findAttribute(customAttributes),
              uuid: UuidAttribute.findAttribute(customAttributes),
            },
          };

          // POS automatically stacks all items, with no way not to stack >:(
          // so we manually detect service items and items with labour assigned and unstack them here

          // service items are never stacked
          if (variant?.product?.isServiceItem) {
            return Array.from({ length: quantity }, () => ({ ...lineItemObj, quantity: 1 as Int }));
          }

          // normal products are stackable only if they do not have any assigned employees
          // so create as many line items as there are employees assigned to this product variant

          const lineItems = [];

          // TODO: clean up soonTM
          const employeeAssignments = (variant?.id ? employeeAssignmentsByProductVariantId[variant?.id] : null) ?? [];

          while (employeeAssignments.length) {
            employeeAssignments.pop();

            lineItems.push({
              ...lineItemObj,
              quantity: 1 as Int,
            });
            lineItemObj.quantity--;
          }

          if (lineItemObj.quantity > 0) {
            lineItems.push(lineItemObj);
          }

          return lineItems;
        },
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
      order.__typename === 'Order' ? moneyV2ToMoney(order.totalOutstandingSet.shopMoney) : order.totalPrice;

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
