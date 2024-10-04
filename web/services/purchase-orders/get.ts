import { Session } from '@shopify/shopify-api';
import type { PurchaseOrderInfo } from './types.js';
import { escapeLike } from '../db/like.js';
import { db } from '../db/db.js';
import { PurchaseOrderPaginationOptions } from '../../schemas/generated/purchase-order-pagination-options.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { awaitNested } from '@teifi-digital/shopify-app-toolbox/promise';
import { groupByKey, indexBy, unique, uniqueBy } from '@teifi-digital/shopify-app-toolbox/array';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { Value } from '@sinclair/typebox/value';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { CustomFieldFilterSchema } from '../custom-field-filters.js';
import { DateTime } from '../../schemas/generated/create-purchase-order.js';
import {
  getPurchaseOrder,
  getPurchaseOrderAssignedEmployees,
  getPurchaseOrderCustomFields,
  getPurchaseOrderLineItemCustomFields,
  getPurchaseOrderLineItems,
} from './queries.js';
import { getStockTransferLineItemsForPurchaseOrder } from '../stock-transfers/queries.js';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { getSpecialOrderLineItemsForPurchaseOrder, getSpecialOrdersByIds } from '../special-orders/queries.js';
import { getProductVariants } from '../product-variants/queries.js';
import { getProducts } from '../products/queries.js';
import { getSerialsByIds } from '../serials/queries.js';
import { getStaffMembers } from '../staff-members/queries.js';

export async function getDetailedPurchaseOrder(
  { shop }: Pick<Session, 'shop'>,
  name: string,
  locationIds: ID[] | null,
) {
  const purchaseOrder = await getPurchaseOrder({ shop, name, locationIds });

  if (!purchaseOrder) {
    return null;
  }

  const linkedOrders = await db.shopifyOrder.getLinkedOrdersByPurchaseOrderId({ purchaseOrderId: purchaseOrder.id });

  const linkedCustomerIds = unique(linkedOrders.map(({ customerId }) => customerId).filter(isNonNullable));
  const linkedCustomers = linkedCustomerIds.length
    ? await db.customers.getMany({ customerIds: linkedCustomerIds })
    : [];

  const linkedOrderIds = unique(linkedOrders.map(({ orderId }) => orderId));
  const linkedWorkOrders = linkedOrderIds.length
    ? await Promise.all(
        linkedOrderIds.map(orderId => db.shopifyOrder.getRelatedWorkOrdersByShopifyOrderId({ orderId })),
      )
        .then(result => result.flat())
        .then(result => uniqueBy(result, wo => wo.id))
    : [];

  // we send along all data from the database. it may not be complete but significantly reduces time TTI in POS.
  // pos will instantly mark the data as stale so it will refetch any missing data
  return await awaitNested({
    name: purchaseOrder.name,
    status: purchaseOrder.status,
    placedDate: purchaseOrder.placedDate ? (purchaseOrder.placedDate.toISOString() as DateTime) : null,
    location: getLocation(purchaseOrder.locationId),
    vendorName: purchaseOrder.vendorName,
    shipFrom: purchaseOrder.shipFrom,
    shipTo: purchaseOrder.shipTo,
    note: purchaseOrder.note,
    discount: purchaseOrder.discount,
    tax: purchaseOrder.tax,
    shipping: purchaseOrder.shipping,
    deposited: purchaseOrder.deposited,
    paid: purchaseOrder.paid,
    customFields: getPurchaseOrderCustomFieldsRecord(purchaseOrder.id),
    lineItems: getDetailedPurchaseOrderLineItems(purchaseOrder.id),
    employeeAssignments: getDetailedPurchaseOrderEmployeeAssignments(shop, purchaseOrder.id),
    linkedOrders: linkedOrders.map(({ orderId: id, name, orderType }) => ({
      id,
      name,
      orderType,
    })),
    linkedCustomers: linkedCustomers.map(({ customerId: id, displayName }) => ({
      id,
      displayName,
    })),
    linkedWorkOrders: linkedWorkOrders.map(({ name }) => ({ name })),
  });
}

export async function getPurchaseOrderInfoPage(
  session: Session,
  paginationOptions: PurchaseOrderPaginationOptions,
  locationIds: ID[] | null,
): Promise<PurchaseOrderInfo[]> {
  if (paginationOptions.query !== undefined) {
    paginationOptions.query = `%${escapeLike(paginationOptions.query)}%`;
  }

  const { shop } = session;

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

  const names = await db.purchaseOrder.getPage({
    limit: paginationOptions.limit,
    query: paginationOptions.query,
    status: paginationOptions.status,
    customerId: paginationOptions.customerId,
    offset: paginationOptions.offset,
    // the first filter is always skipped by the sql to ensure we can run this query without running into the empty record error
    requiredCustomFieldFilters: [{ inverse: false, key: null, value: null }, ...requireCustomFieldFilters],
    shop,
    locationIds,
  });

  return await Promise.all(
    names.map(({ name }) =>
      getDetailedPurchaseOrder(session, name, locationIds).then(purchaseOrder => purchaseOrder ?? never()),
    ),
  );
}

async function getDetailedPurchaseOrderLineItems(purchaseOrderId: number) {
  const [lineItems, lineItemCustomFields, stockTransferLineItems, specialOrderLineItems] = await Promise.all([
    getPurchaseOrderLineItems(purchaseOrderId),
    getPurchaseOrderLineItemCustomFields(purchaseOrderId),
    getStockTransferLineItemsForPurchaseOrder(purchaseOrderId),
    getSpecialOrderLineItemsForPurchaseOrder(purchaseOrderId),
  ]);

  const productVariantIds = unique(lineItems.map(({ productVariantId }) => productVariantId));
  const productVariants = await getProductVariants(productVariantIds);
  const productVariantById = indexBy(productVariants, pv => pv.productVariantId);

  const productIds = unique(productVariants.map(({ productId }) => productId));
  const products = await getProducts(productIds);
  const productById = indexBy(products, p => p.productId);

  const serialIds = unique(lineItems.map(lineItem => lineItem.productVariantSerialId).filter(isNonNullable));
  const serials = await getSerialsByIds(serialIds);
  const serialById = indexBy(serials, s => s.id.toString());

  const shopifyOrderLineItemIds = unique(
    specialOrderLineItems.map(({ shopifyOrderLineItemId }) => shopifyOrderLineItemId).filter(isNonNullable),
  );
  const shopifyOrderLineItems = shopifyOrderLineItemIds.length
    ? await db.shopifyOrder.getLineItemsByIds({ lineItemIds: shopifyOrderLineItemIds })
    : [];
  const shopifyOrderLineItemById = indexBy(shopifyOrderLineItems, soli => soli.lineItemId);

  const orderIds = unique(shopifyOrderLineItems.map(({ orderId }) => orderId));
  const orders = orderIds.length ? await db.shopifyOrder.getMany({ orderIds }) : [];
  const orderById = indexBy(orders, o => o.orderId);

  const specialOrderIds = unique(specialOrderLineItems.map(({ specialOrderId }) => specialOrderId));
  const specialOrders = await getSpecialOrdersByIds(specialOrderIds);
  const specialOrderById = indexBy(specialOrders, so => String(so.id));

  return lineItems.map(
    ({
      uuid,
      quantity,
      availableQuantity,
      productVariantId,
      unitCost,
      specialOrderLineItemId,
      productVariantSerialId,
    }) => {
      const productVariant = productVariantById[productVariantId] ?? never('fk');
      const product = productById[productVariant.productId] ?? never('fk');
      const serial = productVariantSerialId ? (serialById[productVariantSerialId] ?? never('fk')) : null;

      const specialOrderLineItem = specialOrderLineItemId
        ? specialOrderLineItems.find(hasPropertyValue('id', specialOrderLineItemId))
        : null;

      const shopifyOrderLineItem = specialOrderLineItem?.shopifyOrderLineItemId
        ? (shopifyOrderLineItemById[specialOrderLineItem.shopifyOrderLineItemId] ?? never('fk'))
        : null;

      const linkedStockTransferLineItems = stockTransferLineItems.filter(
        hasPropertyValue('purchaseOrderLineItemUuid', uuid),
      );

      const shopifyOrder = shopifyOrderLineItem ? (orderById[shopifyOrderLineItem.orderId] ?? never('fk')) : null;

      return {
        uuid,
        productVariant: {
          id: productVariant.productVariantId,
          title: productVariant.title,
          sku: productVariant.sku,
          inventoryItemId: productVariant.inventoryItemId,
          product: {
            id: product.productId,
            title: product.title,
            handle: product.handle,
            description: product.description,
            productType: product.productType,
            hasOnlyDefaultVariant: product.hasOnlyDefaultVariant,
          },
        },
        // TODO: Warn if this is undefined but special order line item is defined
        shopifyOrderLineItem: (() => {
          if (shopifyOrderLineItem == null) {
            return null;
          }

          const order = shopifyOrder ?? never('fk');

          assertGid(shopifyOrderLineItem.lineItemId);
          assertGid(order.orderId);

          return {
            id: shopifyOrderLineItem.lineItemId,
            order: {
              id: order.orderId,
              name: order.name,
            },
          };
        })(),
        stockTransferLineItems: linkedStockTransferLineItems.map(({ stockTransferName, status, quantity, uuid }) => ({
          stockTransferName,
          uuid,
          status,
          quantity,
        })),
        customFields: Object.fromEntries(
          lineItemCustomFields
            .filter(cf => cf.purchaseOrderLineItemUuid === uuid)
            .map(({ key, value }) => [key, value]),
        ),
        unitCost,
        quantity,
        availableQuantity,
        specialOrderLineItem: specialOrderLineItem
          ? {
              uuid: specialOrderLineItem.uuid,
              name: specialOrderById[specialOrderLineItem.specialOrderId]?.name ?? never('fk'),
              quantity: specialOrderLineItem.quantity,
            }
          : null,
        serial: serial
          ? {
              serial: serial.serial,
            }
          : null,
      };
    },
  );
}

async function getPurchaseOrderCustomFieldsRecord(purchaseOrderId: number) {
  const customFields = await getPurchaseOrderCustomFields(purchaseOrderId);
  return Object.fromEntries(customFields.map(({ key, value }) => [key, value]));
}

async function getDetailedPurchaseOrderEmployeeAssignments(shop: string, purchaseOrderId: number) {
  const employeeAssignments = await getPurchaseOrderAssignedEmployees(purchaseOrderId);

  const employeeIds = employeeAssignments.map(({ employeeId }) => employeeId);
  const employees = await getStaffMembers(shop, employeeIds);
  const employeesById = groupByKey(employees, 'staffMemberId');

  return employeeAssignments.map(({ employeeId }) => {
    const [{ name } = never('FK doesnt lie')] = employeesById?.[employeeId] ?? [];
    assertGid(employeeId);
    return { employeeId, name };
  });
}

async function getLocation(locationId: string | null) {
  if (locationId === null) {
    return null;
  }

  const [location = never()] = await db.locations.get({ locationId });

  assertGid(locationId);

  return {
    id: locationId,
    name: location.name,
  };
}
