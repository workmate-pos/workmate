import { Session } from '@shopify/shopify-api';
import { db } from '../db/db.js';
import { DateTime, Int } from '../gql/queries/generated/schema.js';
import { escapeLike } from '../db/like.js';
import type { WorkOrderPaginationOptions } from '../../schemas/generated/work-order-pagination-options.js';
import {
  ShopifyOrderLineItem,
  DetailedWorkOrder,
  DetailedWorkOrderCharge,
  WorkOrderDiscount,
  WorkOrderInfo,
  DetailedWorkOrderItem,
  WorkOrderOrder,
  WorkOrderPaymentTerms,
} from './types.js';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { assertGidOrNull } from '../../util/assertions.js';
import { awaitNested } from '@teifi-digital/shopify-app-toolbox/promise';
import { assertDecimal, assertMoney } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { indexBy, indexByMap, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { hasNonNullableProperty, hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { Value } from '@sinclair/typebox/value';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { CustomFieldFilterSchema } from '../custom-field-filters.js';
import {
  WorkOrder,
  getWorkOrder,
  getWorkOrderCharges,
  getWorkOrderCustomFields,
  getWorkOrderItemCustomFields,
  getWorkOrderItems,
} from './queries.js';
import { match, P } from 'ts-pattern';
import { identity } from '@teifi-digital/shopify-app-toolbox/functional';
import {
  getPurchaseOrderLineItemsByShopifyOrderLineItemIds,
  getPurchaseOrdersByIds,
} from '../purchase-orders/queries.js';
import {
  getStockTransfersByIds,
  getTransferOrderLineItemsByShopifyOrderLineItemIds,
} from '../stock-transfers/queries.js';

export async function getDetailedWorkOrder(session: Session, name: string): Promise<DetailedWorkOrder | null> {
  const { shop } = session;
  const workOrder = await getWorkOrder({ shop, name });

  if (!workOrder) {
    return null;
  }

  assertGid(workOrder.customerId);
  assertGidOrNull(workOrder.derivedFromOrderId);
  assertGidOrNull(workOrder.companyId);
  assertGidOrNull(workOrder.companyLocationId);
  assertGidOrNull(workOrder.companyContactId);

  return await awaitNested({
    name: workOrder.name,
    status: workOrder.status,
    customerId: workOrder.customerId,
    companyId: workOrder.companyId,
    companyLocationId: workOrder.companyLocationId,
    companyContactId: workOrder.companyContactId,
    dueDate: workOrder.dueDate.toISOString() as DateTime,
    derivedFromOrderId: workOrder.derivedFromOrderId,
    note: workOrder.note,
    internalNote: workOrder.internalNote,
    items: getDetailedWorkOrderItems(workOrder.id),
    charges: getDetailedWorkOrderCharges(workOrder.id),
    orders: getWorkOrderOrders(workOrder.id),
    customFields: getWorkOrderCustomFieldsRecord(workOrder.id),
    discount: getWorkOrderDiscount(workOrder),
    paymentTerms: getWorkOrderPaymentTerms(workOrder),
  });
}

export async function getLineItemsById(lineItemIds: ID[]): Promise<Record<string, ShopifyOrderLineItem>> {
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

async function getDetailedWorkOrderItems(workOrderId: number): Promise<DetailedWorkOrderItem[]> {
  const [items, customFields] = await Promise.all([
    getWorkOrderItems(workOrderId),
    getWorkOrderItemCustomFields(workOrderId),
  ]);

  const lineItemIds = unique(items.map(item => item.shopifyOrderLineItemId).filter(isNonNullable));

  const [lineItemById, purchaseOrderLineItems, transferOrderLineItems] = await Promise.all([
    getLineItemsById(lineItemIds),
    getPurchaseOrderLineItemsByShopifyOrderLineItemIds(lineItemIds),
    getTransferOrderLineItemsByShopifyOrderLineItemIds(lineItemIds),
  ]);

  const purchaseOrderIds = unique(purchaseOrderLineItems.map(lineItem => lineItem.purchaseOrderId));
  const transferOrderIds = unique(transferOrderLineItems.map(lineItem => lineItem.stockTransferId));

  const [purchaseOrders, transferOrders] = await Promise.all([
    getPurchaseOrdersByIds(purchaseOrderIds),
    getStockTransfersByIds(transferOrderIds),
  ]);
  const purchaseOrderById = indexBy(purchaseOrders, po => String(po.id));
  const transferOrderById = indexBy(transferOrders, po => String(po.id));

  return items.map<DetailedWorkOrderItem>(item => {
    const itemCustomFields = customFields.filter(hasPropertyValue('workOrderItemUuid', item.uuid));

    const itemPurchaseOrderLineItems = purchaseOrderLineItems
      .filter(hasPropertyValue('shopifyOrderLineItemId', item.shopifyOrderLineItemId))
      .filter(hasNonNullableProperty('purchaseOrderId'));
    const itemTransferOrderLineItems = transferOrderLineItems
      .filter(hasPropertyValue('shopifyOrderLineItemId', item.shopifyOrderLineItemId))
      .filter(hasNonNullableProperty('stockTransferId'));

    const itemPurchaseOrders = itemPurchaseOrderLineItems.map(
      poLineItem => purchaseOrderById[poLineItem.purchaseOrderId] ?? never('fk'),
    );
    const itemTransferOrders = itemTransferOrderLineItems.map(
      poLineItem => transferOrderById[poLineItem.stockTransferId] ?? never('fk'),
    );

    const base = {
      uuid: item.uuid,
      quantity: item.data.quantity,
      absorbCharges: item.data.absorbCharges,
      shopifyOrderLineItem: item.shopifyOrderLineItemId
        ? lineItemById[item.shopifyOrderLineItemId] ?? never('fk')
        : null,
      purchaseOrders: itemPurchaseOrders.map(po => ({
        name: po.name,
        items: itemPurchaseOrderLineItems.filter(hasPropertyValue('purchaseOrderId', po.id)),
      })),
      transferOrders: itemTransferOrders.map(to => ({
        name: to.name,
        items: itemTransferOrderLineItems.filter(hasPropertyValue('stockTransferId', to.id)),
      })),
      customFields: Object.fromEntries(itemCustomFields.map(({ key, value }) => [key, value])),
    } as const;

    if (item.data.type === 'product') {
      return {
        ...base,
        type: 'product',
        productVariantId: item.data.productVariantId,
      };
    } else if (item.data.type === 'custom-item') {
      return {
        ...base,
        type: 'custom-item',
        name: item.data.name,
        unitPrice: item.data.unitPrice,
      };
    } else {
      return item.data satisfies never;
    }
  });
}

async function getDetailedWorkOrderCharges(workOrderId: number): Promise<DetailedWorkOrderCharge[]> {
  const charges = await getWorkOrderCharges(workOrderId);

  const lineItemIds = unique(charges.map(element => element.shopifyOrderLineItemId).filter(isNonNullable));
  const lineItemById = await getLineItemsById(lineItemIds);

  return charges.map<DetailedWorkOrderCharge>(charge => {
    const base = {
      uuid: charge.uuid,
      employeeId: charge.data.employeeId,
      name: charge.data.name,
      removeLocked: charge.data.removeLocked,
      workOrderItemUuid: charge.workOrderItemUuid,
      shopifyOrderLineItem: charge.shopifyOrderLineItemId
        ? lineItemById[charge.shopifyOrderLineItemId] ?? never()
        : null,
    };

    return {
      ...base,
      ...match(charge.data)
        .with(
          {
            type: P.select('type', 'fixed-price-labour'),
            amount: P.select('amount'),
            amountLocked: P.select('amountLocked'),
          },
          identity,
        )
        .with(
          {
            type: P.select('type', 'hourly-labour'),
            rate: P.select('rate'),
            hours: P.select('hours'),
            rateLocked: P.select('rateLocked'),
            hoursLocked: P.select('hoursLocked'),
          },
          identity,
        )
        .exhaustive(),
    };
  });
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

export async function getWorkOrderCustomFieldsRecord(workOrderId: number): Promise<Record<string, string>> {
  const customFields = await getWorkOrderCustomFields(workOrderId);
  return Object.fromEntries(customFields.map(({ key, value }) => [key, value]));
}

export function getWorkOrderDiscount(
  workOrder: Pick<WorkOrder, 'discountType' | 'discountAmount'>,
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

export function getWorkOrderPaymentTerms(
  workOrder: Pick<WorkOrder, 'id' | 'paymentTermsTemplateId' | 'paymentFixedDueDate'>,
): WorkOrderPaymentTerms | null {
  if (workOrder.paymentTermsTemplateId === null) {
    return null;
  }

  assertGid(workOrder.paymentTermsTemplateId);

  return {
    templateId: workOrder.paymentTermsTemplateId,
    date: (workOrder.paymentFixedDueDate?.toISOString() ?? null) as DateTime | null,
  };
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
  });

  return await Promise.all(
    page.map(workOrder => getDetailedWorkOrder(session, workOrder.name).then(wo => wo ?? never())),
  );
}
