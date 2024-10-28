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
  WorkOrderSerial,
} from './types.js';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { awaitNested } from '@teifi-digital/shopify-app-toolbox/promise';
import { assertDecimal, assertMoney } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { indexBy, indexByMap, sum, unique } from '@teifi-digital/shopify-app-toolbox/array';
import {
  hasNestedPropertyValue,
  hasNonNullableProperty,
  hasPropertyValue,
  isNonNullable,
} from '@teifi-digital/shopify-app-toolbox/guards';
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
  getPurchaseOrderReceiptLineItemsByShopifyOrderLineItemIds,
  getPurchaseOrdersByIds,
} from '../purchase-orders/queries.js';
import {
  getStockTransfersByIds,
  getTransferOrderLineItemsByShopifyOrderLineItemIds,
} from '../stock-transfers/queries.js';
import { getShopifyOrderLineItemReservationsByIds } from '../sourcing/queries.js';
import { UUID } from '@work-orders/common/util/uuid.js';
import { getSpecialOrderLineItemsByShopifyOrderLineItemIds, getSpecialOrdersByIds } from '../special-orders/queries.js';
import { getSerial } from '../serials/queries.js';
import { LocalsTeifiUser } from '../../decorators/permission.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { gql } from '../gql/gql.js';

export async function getDetailedWorkOrder(
  session: Session,
  name: string,
  locationIds: ID[] | null,
): Promise<DetailedWorkOrder | null> {
  const { shop } = session;
  const workOrder = await getWorkOrder({ shop, name, locationIds });

  if (!workOrder) {
    return null;
  }

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
    items: getDetailedWorkOrderItems(session, workOrder.id, workOrder.locationId),
    charges: getDetailedWorkOrderCharges(workOrder.id),
    orders: getWorkOrderOrders(workOrder.id),
    customFields: getWorkOrderCustomFieldsRecord(workOrder.id),
    discount: getWorkOrderDiscount(workOrder),
    paymentTerms: getWorkOrderPaymentTerms(workOrder),
    serial: getWorkOrderSerial(workOrder),
    locationId: workOrder.locationId,
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

async function getDetailedWorkOrderItems(
  session: Session,
  workOrderId: number,
  locationId: ID | null,
): Promise<DetailedWorkOrderItem[]> {
  const [items, customFields] = await Promise.all([
    getWorkOrderItems(workOrderId),
    getWorkOrderItemCustomFields(workOrderId),
  ]);

  const graphql = new Graphql(session);
  const productVariantIds = unique(
    items
      .filter(hasNestedPropertyValue('data.type', 'product'))
      .map(item => item.data.productVariantId)
      .filter(isNonNullable),
  );

  const lineItemIds = unique(items.map(item => item.shopifyOrderLineItemId).filter(isNonNullable));

  const [
    inventoryItems,
    lineItemById,
    lineItemReservations,
    transferOrderLineItems,
    specialOrderLineItems,
    purchaseOrderLineItems,
    purchaseOrderReceiptLineItems,
  ] = await Promise.all([
    await Promise.all([
      !!locationId
        ? gql.inventoryItems.getManyWithLocationInventoryLevelByProductVariantIds.run(graphql, {
          ids: productVariantIds,
          locationId,
        })
        : null,
    getLineItemsById(lineItemIds),
    // TODO: Show reservations inside the work order
    // TODO: Show special orders inside the work order
    getShopifyOrderLineItemReservationsByIds(lineItemIds),
    getTransferOrderLineItemsByShopifyOrderLineItemIds(lineItemIds),
    getSpecialOrderLineItemsByShopifyOrderLineItemIds(lineItemIds),
    getPurchaseOrderLineItemsByShopifyOrderLineItemIds(lineItemIds),
    getPurchaseOrderReceiptLineItemsByShopifyOrderLineItemIds(lineItemIds),
  ]);

  const transferOrderIds = unique(transferOrderLineItems.map(lineItem => lineItem.stockTransferId));
  const specialOrderIds = unique(specialOrderLineItems.map(lineItem => lineItem.specialOrderId));
  const purchaseOrderIds = unique(purchaseOrderLineItems.map(lineItem => lineItem.purchaseOrderId));

  const [transferOrders, specialOrders, purchaseOrders] = await Promise.all([
    getStockTransfersByIds(transferOrderIds),
    getSpecialOrdersByIds(specialOrderIds),
    getPurchaseOrdersByIds(purchaseOrderIds),
  ]);

  const transferOrderById = indexBy(transferOrders, po => String(po.id));
  const specialOrderById = indexBy(specialOrders, so => String(so.id));
  const purchaseOrderById = indexBy(purchaseOrders, po => String(po.id));

  return items.map<DetailedWorkOrderItem>(item => {
    const itemCustomFields = customFields.filter(hasPropertyValue('workOrderItemUuid', item.uuid));

    const itemReservations = !!item.shopifyOrderLineItemId
      ? lineItemReservations.filter(hasPropertyValue('lineItemId', item.shopifyOrderLineItemId))
      : [];
    const itemTransferOrderLineItems = transferOrderLineItems
      .filter(hasPropertyValue('shopifyOrderLineItemId', item.shopifyOrderLineItemId))
      .filter(hasNonNullableProperty('stockTransferId'));
    const itemSpecialOrderLineItems = item.shopifyOrderLineItemId
      ? specialOrderLineItems
          .filter(hasPropertyValue('shopifyOrderLineItemId', item.shopifyOrderLineItemId))
          .filter(hasNonNullableProperty('specialOrderId'))
      : [];
    const itemPurchaseOrderLineItems = item.shopifyOrderLineItemId
      ? purchaseOrderLineItems.filter(
          li =>
            !!li.specialOrderLineItemId &&
            itemSpecialOrderLineItems.some(hasPropertyValue('id', li.specialOrderLineItemId)),
        )
      : [];

    const itemTransferOrders = itemTransferOrderLineItems.map(
      poLineItem => transferOrderById[poLineItem.stockTransferId] ?? never('fk'),
    );
    const itemSpecialOrders = itemSpecialOrderLineItems.map(
      poLineItem => specialOrderById[poLineItem.specialOrderId] ?? never('fk'),
    );
    const itemPurchaseOrders = itemPurchaseOrderLineItems.map(
      poLineItem => purchaseOrderById[poLineItem.purchaseOrderId] ?? never('fk'),
    );

    const availableInventoryQuantity =
      item.data.type !== 'product'
        ? 0
        : (inventoryItems?.nodes
            .filter(hasNestedPropertyValue('__typename', 'ProductVariant'))
            .find(hasPropertyValue('id', item.data.productVariantId))
            ?.inventoryItem.inventoryLevel?.quantities.find(quantity => quantity.name === 'available')?.quantity ?? 0);

    const base = {
      uuid: item.uuid,
      quantity: item.data.quantity,
      absorbCharges: item.data.absorbCharges,
      shopifyOrderLineItem: item.shopifyOrderLineItemId
        ? (lineItemById[item.shopifyOrderLineItemId] ?? never('fk'))
        : null,
      purchaseOrders: itemPurchaseOrders.map(po => ({
        name: po.name,
        items: itemPurchaseOrderLineItems.filter(hasPropertyValue('purchaseOrderId', po.id)).map(li => {
          const availableQuantity = purchaseOrderReceiptLineItems
            .filter(hasPropertyValue('purchaseOrderId', po.id))
            .filter(hasPropertyValue('lineItemUuid', li.uuid))
            .map(li => li.quantity)
            .reduce((a, b) => a + b, 0);

          return {
            unitCost: li.unitCost,
            quantity: li.quantity,
            availableQuantity,
          };
        }),
      })),
      transferOrders: itemTransferOrders.map(to => ({
        name: to.name,
        items: itemTransferOrderLineItems.filter(hasPropertyValue('stockTransferId', to.id)),
      })),
      specialOrders: itemSpecialOrders.map(so => ({
        name: so.name,
        items: itemSpecialOrderLineItems.filter(hasPropertyValue('specialOrderId', so.id)).map(lineItem => {
          const orderedQuantity = itemPurchaseOrderLineItems
            .filter(hasPropertyValue('specialOrderLineItemId', lineItem.id))
            .map(lineItem => lineItem.quantity)
            .reduce((a, b) => a + b, 0);

          return {
            quantity: lineItem.quantity,
            orderedQuantity,
          };
        }),
      })),
      reservations: itemReservations.map(({ quantity, locationId }) => ({ quantity, locationId })),
      availableInventoryQuantity,
      customFields: Object.fromEntries(itemCustomFields.map(({ key, value }) => [key, value])),
    } as const satisfies Partial<DetailedWorkOrderItem>;

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
      uuid: charge.uuid as UUID,
      employeeId: charge.data.employeeId,
      name: charge.data.name,
      removeLocked: charge.data.removeLocked,
      workOrderItemUuid: charge.workOrderItemUuid as UUID | null,
      shopifyOrderLineItem: charge.shopifyOrderLineItemId
        ? (lineItemById[charge.shopifyOrderLineItemId] ?? never())
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
  locationIds: ID[] | null,
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
    fulfilled: true,
    pending: false,
    undefined: undefined,
  }[paginationOptions.purchaseOrderStatus ?? 'undefined'];

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
    unpaid: paginationOptions.paymentStatus === 'unpaid',
    partiallyPaid: paginationOptions.paymentStatus === 'partially-paid',
    fullyPaid: paginationOptions.paymentStatus === 'fully-paid',
    locationIds,
  });

  return await Promise.all(
    page.map(workOrder => getDetailedWorkOrder(session, workOrder.name, locationIds).then(wo => wo ?? never())),
  );
}

export async function getWorkOrderSerial(
  workOrder: Pick<WorkOrder, 'productVariantSerialId'>,
): Promise<WorkOrderSerial | null> {
  if (!workOrder.productVariantSerialId) return null;

  const pvs = await getSerial({ id: workOrder.productVariantSerialId });
  const { productVariantId, serial, locationId } = pvs ?? never('fk');

  // TODO: Warnings on front end in case data doesnt match, e.g. customer and pvs customer

  return {
    productVariantId,
    serial,
    locationId,
  };
}
