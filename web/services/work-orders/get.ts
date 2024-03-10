import { Session } from '@shopify/shopify-api';
import { db } from '../db/db.js';
import { DateTime, Int } from '../gql/queries/generated/schema.js';
import { escapeLike } from '../db/like.js';
import type { WorkOrderPaginationOptions } from '../../schemas/generated/work-order-pagination-options.js';
import { WorkOrder, WorkOrderCharge, WorkOrderInfo, WorkOrderItem } from './types.js';
import { assertGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { assertGidOrNull } from '../../util/assertions.js';
import { awaitNested } from '@teifi-digital/shopify-app-toolbox/promise';
import { assertDecimal, assertMoney } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { groupByKey, unique } from '@teifi-digital/shopify-app-toolbox/array';

export async function getWorkOrder(session: Session, name: string): Promise<WorkOrder | null> {
  const [workOrder] = await db.workOrder.get({ shop: session.shop, name });

  if (!workOrder) {
    return null;
  }

  assertGid(workOrder.customerId);
  assertGidOrNull(workOrder.derivedFromOrderId);

  return await awaitNested({
    name: workOrder.name,
    status: workOrder.status,
    customerId: workOrder.customerId,
    dueDate: workOrder.dueDate.toISOString() as DateTime,
    derivedFromOrderId: workOrder.derivedFromOrderId,
    note: workOrder.note,
    items: getWorkOrderItems(workOrder.id),
    charges: getWorkOrderCharges(workOrder.id),
  });
}

async function getWorkOrderItems(workOrderId: number): Promise<WorkOrderItem[]> {
  const items = await db.workOrder.getItems({ workOrderId });
  return items.map<WorkOrderItem>(item => {
    assertGidOrNull(item.shopifyOrderLineItemId);
    assertGid(item.productVariantId);

    return {
      uuid: item.uuid,
      shopifyOrderLineItemId: item.shopifyOrderLineItemId,
      productVariantId: item.productVariantId,
      quantity: item.quantity as Int,
      absorbCharges: item.absorbCharges,
    };
  });
}

async function getWorkOrderCharges(workOrderId: number): Promise<WorkOrderCharge[]> {
  const [fixedPriceLabour, hourlyLabour] = await Promise.all([
    db.workOrderCharges.getFixedPriceLabourCharges({ workOrderId }),
    db.workOrderCharges.getHourlyLabourCharges({ workOrderId }),
  ]);

  return [
    ...fixedPriceLabour.map<WorkOrderCharge>(charge => {
      assertGidOrNull(charge.shopifyOrderLineItemId);
      assertGidOrNull(charge.employeeId);
      assertMoney(charge.amount);

      return {
        type: 'fixed-price-labour',
        uuid: charge.uuid,
        workOrderItemUuid: charge.workOrderItemUuid,
        shopifyOrderLineItemId: charge.shopifyOrderLineItemId,
        name: charge.name,
        amount: charge.amount,
        employeeId: charge.employeeId,
      };
    }),
    ...hourlyLabour.map<WorkOrderCharge>(charge => {
      assertGidOrNull(charge.shopifyOrderLineItemId);
      assertGidOrNull(charge.employeeId);
      assertMoney(charge.rate);
      assertDecimal(charge.hours);

      return {
        type: 'hourly-labour',
        uuid: charge.uuid,
        workOrderItemUuid: charge.workOrderItemUuid,
        shopifyOrderLineItemId: charge.shopifyOrderLineItemId,
        name: charge.name,
        rate: charge.rate,
        hours: charge.hours,
        employeeId: charge.employeeId,
      };
    }),
  ];
}

/**
 * Fetches a page of work orders from the database.
 * Loads only basic data to display in a list, such as the price and status.
 */
export async function getWorkOrderInfoPage(
  session: Session,
  paginationOptions: WorkOrderPaginationOptions,
): Promise<WorkOrderInfo[]> {
  if (paginationOptions.query !== undefined) {
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

  const customerIds = unique(page.map(workOrder => workOrder.customerId));
  const customers = customerIds.length ? await db.customers.getMany({ customerIds }) : [];
  const customersById = groupByKey(customers, 'customerId');

  return await Promise.all(
    page.map<Promise<WorkOrderInfo>>(async workOrder => {
      const linkedOrders = await db.shopifyOrder.getLinkedOrdersByWorkOrderId({ workOrderId: workOrder.id });

      assertGid(workOrder.customerId);

      return {
        name: workOrder.name,
        status: workOrder.status,
        dueDate: workOrder.dueDate.toISOString() as DateTime,
        customer: {
          id: workOrder.customerId,
          name: customersById[workOrder.customerId]?.[0]?.displayName ?? 'Unknown customer',
        },
        orders: linkedOrders.map(order => {
          assertGid(order.orderId);
          assertMoney(order.total);
          assertMoney(order.outstanding);

          return {
            id: order.orderId,
            name: order.name,
            type: order.orderType,
            total: order.total,
            outstanding: order.outstanding,
          };
        }),
      };
    }),
  );
}
