import { Session } from '@shopify/shopify-api';
import { db } from '../db/db.js';
import { DateTime, Int } from '../gql/queries/generated/schema.js';
import { escapeLike } from '../db/like.js';
import type { WorkOrderPaginationOptions } from '../../schemas/generated/work-order-pagination-options.js';
import {
  ShopifyOrderLineItem,
  WorkOrder,
  WorkOrderCharge,
  WorkOrderDiscount,
  WorkOrderInfo,
  WorkOrderItem,
  WorkOrderOrder,
} from './types.js';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { assertGidOrNull } from '../../util/assertions.js';
import { awaitNested } from '@teifi-digital/shopify-app-toolbox/promise';
import { assertDecimal, assertMoney, BigDecimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { indexBy, indexByMap, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { Value } from '@sinclair/typebox/value';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { CustomFieldFilterSchema } from '../custom-field-filters.js';
import { IGetResult } from '../db/queries/generated/work-order.sql.js';
import { isDepositDiscount } from '@work-orders/work-order-shopify-order';

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
    internalNote: workOrder.internalNote,
    items: getWorkOrderItems(workOrder.id),
    charges: getWorkOrderCharges(workOrder.id),
    orders: getWorkOrderOrders(workOrder.id),
    customFields: getWorkOrderCustomFields(workOrder.id),
    discount: getWorkOrderDiscount(workOrder),
    depositedAmount: getWorkOrderDepositedAmount(workOrder.id),
    depositedReconciledAmount: getWorkOrderDepositedReconciledAmount(workOrder.id),
  });
}

async function getLineItemsById(lineItemIds: ID[]): Promise<Record<string, ShopifyOrderLineItem>> {
  const lineItems = lineItemIds.length ? await db.shopifyOrder.getLineItemsByIds({ lineItemIds }) : [];
  return indexByMap(
    lineItems,
    lineItem => lineItem.lineItemId,
    lineItem => {
      assertGid(lineItem.lineItemId);
      assertGid(lineItem.orderId);
      assertMoney(lineItem.discountedUnitPrice);

      return {
        id: lineItem.lineItemId,
        orderId: lineItem.orderId,
        quantity: lineItem.quantity as Int,
        discountedUnitPrice: lineItem.discountedUnitPrice,
      };
    },
  );
}

async function getWorkOrderItems(workOrderId: number): Promise<WorkOrderItem[]> {
  const items = await db.workOrder.getItems({ workOrderId });

  const lineItemIds = unique(
    items
      .map(item => {
        assertGidOrNull(item.shopifyOrderLineItemId);
        return item.shopifyOrderLineItemId;
      })
      .filter(isNonNullable),
  );
  const lineItemById = await getLineItemsById(lineItemIds);

  const purchaseOrderLineItems = lineItemIds.length
    ? await db.purchaseOrder.getPurchaseOrderLineItemsByShopifyOrderLineItemIds({
        shopifyOrderLineItemIds: lineItemIds,
      })
    : [];

  const purchaseOrderIds = unique(purchaseOrderLineItems.map(lineItem => lineItem.purchaseOrderId));

  const purchaseOrders = purchaseOrderIds.length ? await db.purchaseOrder.getMany({ purchaseOrderIds }) : [];
  const purchaseOrderById = indexBy(purchaseOrders, po => String(po.id));

  return items.map<WorkOrderItem>(item => {
    assertGidOrNull(item.shopifyOrderLineItemId);
    assertGid(item.productVariantId);

    const itemPurchaseOrderLineItems = purchaseOrderLineItems.filter(
      li => li.shopifyOrderLineItemId === item.shopifyOrderLineItemId && item.shopifyOrderLineItemId !== null,
    );

    const itemPurchaseOrders = itemPurchaseOrderLineItems.map(
      poLineItem => purchaseOrderById[poLineItem.purchaseOrderId] ?? never('fk'),
    );

    return {
      uuid: item.uuid,
      shopifyOrderLineItem: item.shopifyOrderLineItemId
        ? lineItemById[item.shopifyOrderLineItemId] ?? never('fk')
        : null,
      purchaseOrders: itemPurchaseOrders.map(po => ({
        name: po.name,
        items: itemPurchaseOrderLineItems
          .filter(li => li.purchaseOrderId === po.id)
          .map(li => {
            assertMoney(li.unitCost);

            return {
              unitCost: li.unitCost,
              quantity: li.quantity as Int,
              availableQuantity: li.availableQuantity as Int,
            };
          }),
      })),
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

  const lineItemIds = unique(
    [...fixedPriceLabour, ...hourlyLabour]
      .map(element => {
        assertGidOrNull(element.shopifyOrderLineItemId);
        return element.shopifyOrderLineItemId;
      })
      .filter(isNonNullable),
  );
  const lineItemById = await getLineItemsById(lineItemIds);

  return [
    ...fixedPriceLabour.map<WorkOrderCharge>(charge => {
      assertGidOrNull(charge.shopifyOrderLineItemId);
      assertGidOrNull(charge.employeeId);
      assertMoney(charge.amount);

      return {
        type: 'fixed-price-labour',
        uuid: charge.uuid,
        workOrderItemUuid: charge.workOrderItemUuid,
        shopifyOrderLineItem: charge.shopifyOrderLineItemId
          ? lineItemById[charge.shopifyOrderLineItemId] ?? never()
          : null,
        name: charge.name,
        amount: charge.amount,
        employeeId: charge.employeeId,
        amountLocked: charge.amountLocked,
        removeLocked: charge.removeLocked,
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
        shopifyOrderLineItem: charge.shopifyOrderLineItemId
          ? lineItemById[charge.shopifyOrderLineItemId] ?? never()
          : null,
        name: charge.name,
        rate: charge.rate,
        hours: charge.hours,
        employeeId: charge.employeeId,
        rateLocked: charge.rateLocked,
        hoursLocked: charge.hoursLocked,
        removeLocked: charge.removeLocked,
      };
    }),
  ];
}

async function getWorkOrderOrders(workOrderId: number): Promise<WorkOrderOrder[]> {
  const relatedOrders = await db.shopifyOrder.getLinkedOrdersByWorkOrderId({ workOrderId });

  return relatedOrders.map<WorkOrderOrder>(order => {
    assertGid(order.orderId);

    return {
      id: order.orderId,
      name: order.name,
      type: order.orderType,
    };
  });
}

async function getWorkOrderCustomFields(workOrderId: number): Promise<Record<string, string>> {
  const customFields = await db.workOrder.getCustomFields({ workOrderId });
  return Object.fromEntries(customFields.map(({ key, value }) => [key, value]));
}

export function getWorkOrderDiscount(
  workOrder: Pick<IGetResult, 'discountType' | 'discountAmount'>,
): WorkOrderDiscount | null {
  if (!workOrder.discountAmount) return null;
  if (!workOrder.discountType) return null;

  if (workOrder.discountType === 'FIXED_AMOUNT') {
    assertMoney(workOrder.discountAmount);
    return {
      type: 'FIXED_AMOUNT',
      value: workOrder.discountAmount,
    };
  }

  if (workOrder.discountType === 'PERCENTAGE') {
    assertDecimal(workOrder.discountAmount);
    return {
      type: 'PERCENTAGE',
      value: workOrder.discountAmount,
    };
  }

  return workOrder.discountType satisfies never;
}

export async function getWorkOrderDepositedAmount(workOrderId: number): Promise<Money> {
  const deposits = await db.workOrder.getPaidDeposits({ workOrderId });
  return BigDecimal.sum(...deposits.map(deposit => BigDecimal.fromString(deposit.amount))).toMoney();
}

export async function getWorkOrderDepositedReconciledAmount(workOrderId: number): Promise<Money> {
  const discounts = await db.workOrder.getAppliedDiscounts({ workOrderId });
  const depositDiscounts = discounts.filter(isDepositDiscount);
  return BigDecimal.sum(...depositDiscounts.map(discount => BigDecimal.fromString(discount.amount))).toMoney();
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

  const customFieldFilters =
    paginationOptions.customFieldFilters?.map(json => {
      const parsed = JSON.parse(json);
      try {
        return Value.Decode(CustomFieldFilterSchema, parsed);
      } catch (e) {
        throw new HttpError('Invalid custom field filter', 400);
      }
    }) ?? [];

  const requireCustomFieldFilters = customFieldFilters.filter(hasPropertyValue('type', 'require-field')) ?? [];

  const inverseOrderConditions = paginationOptions.excludePaymentStatus ?? false;

  const purchaseOrdersFulfilled = {
    FULFILLED: true,
    PENDING: false,
    UNDEFINED: undefined,
  }[paginationOptions.purchaseOrderStatus ?? 'UNDEFINED'];

  const page = await db.workOrder.getPage({
    shop: session.shop,
    status: paginationOptions.status,
    offset: paginationOptions.offset,
    limit: paginationOptions.limit,
    query: paginationOptions.query,
    employeeIds: paginationOptions.employeeIds,
    customerId: paginationOptions.customerId,
    // the first filter is always skipped by the sql to ensure we can run this query without running into the empty record error
    requiredCustomFieldFilters: [{ inverse: false, key: null, value: null }, ...requireCustomFieldFilters],
    afterDueDate: paginationOptions.afterDueDate,
    beforeDueDate: paginationOptions.beforeDueDate,
    purchaseOrdersFulfilled,
    inverseOrderConditions,
    unpaid: paginationOptions.paymentStatus === 'UNPAID',
    partiallyPaid: paginationOptions.paymentStatus === 'PARTIALLY_PAID',
    fullyPaid: paginationOptions.paymentStatus === 'FULLY_PAID',
    hasPaidDeposit: paginationOptions.paymentStatus === 'HAS_DEPOSIT',
  });

  return await Promise.all(page.map(workOrder => getWorkOrder(session, workOrder.name).then(wo => wo ?? never())));
}
