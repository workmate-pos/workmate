import { Session } from '@shopify/shopify-api';
import type { PurchaseOrderInfo } from './types.js';
import { escapeLike } from '../db/like.js';
import { db } from '../db/db.js';
import { PurchaseOrderPaginationOptions } from '../../schemas/generated/purchase-order-pagination-options.js';
import { assertGidOrNull, assertInt, assertMoneyOrNull } from '../../util/assertions.js';
import { assertGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { assertMoney } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { awaitNested } from '@teifi-digital/shopify-app-toolbox/promise';
import { groupByKey, indexBy, unique, uniqueBy } from '@teifi-digital/shopify-app-toolbox/array';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { Value } from '@sinclair/typebox/value';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { CustomFieldFilterSchema } from '../custom-field-filters.js';
import { DateTime } from '../../schemas/generated/create-purchase-order.js';

export async function getPurchaseOrder({ shop }: Pick<Session, 'shop'>, name: string) {
  const [purchaseOrder] = await db.purchaseOrder.get({ name, shop });

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

  assertGidOrNull(purchaseOrder.locationId);
  assertMoneyOrNull(purchaseOrder.discount);
  assertMoneyOrNull(purchaseOrder.tax);
  assertMoneyOrNull(purchaseOrder.shipping);
  assertMoneyOrNull(purchaseOrder.deposited);
  assertMoneyOrNull(purchaseOrder.paid);

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
    customFields: getPurchaseOrderCustomFields(purchaseOrder.id),
    lineItems: getPurchaseOrderLineItems(purchaseOrder.id),
    employeeAssignments: getPurchaseOrderEmployeeAssignments(purchaseOrder.id),
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
  });

  return await Promise.all(
    names.map(({ name }) => getPurchaseOrder(session, name).then(purchaseOrder => purchaseOrder ?? never())),
  );
}

async function getPurchaseOrderLineItems(purchaseOrderId: number) {
  const [lineItems, allLineItemCustomFields] = await Promise.all([
    db.purchaseOrder.getLineItems({ purchaseOrderId }),
    db.purchaseOrder.getLineItemCustomFields({ purchaseOrderId }),
  ]);

  const productVariantIds = unique(lineItems.map(({ productVariantId }) => productVariantId));
  const productVariants = productVariantIds.length ? await db.productVariants.getMany({ productVariantIds }) : [];
  const productVariantById = indexBy(productVariants, pv => pv.productVariantId);

  const productIds = unique(productVariants.map(({ productId }) => productId));
  const products = productIds.length ? await db.products.getMany({ productIds }) : [];
  const productById = indexBy(products, p => p.productId);

  const shopifyOrderLineItemIds = unique(
    lineItems.map(({ shopifyOrderLineItemId }) => shopifyOrderLineItemId).filter(isNonNullable),
  );
  const shopifyOrderLineItems = shopifyOrderLineItemIds.length
    ? await db.shopifyOrder.getLineItemsByIds({ lineItemIds: shopifyOrderLineItemIds })
    : [];
  const shopifyOrderLineItemById = indexBy(shopifyOrderLineItems, soli => soli.lineItemId);

  const orderIds = unique(shopifyOrderLineItems.map(({ orderId }) => orderId));
  const orders = orderIds.length ? await db.shopifyOrder.getMany({ orderIds }) : [];
  const orderById = indexBy(orders, o => o.orderId);

  return lineItems.map(({ uuid, quantity, availableQuantity, productVariantId, shopifyOrderLineItemId, unitCost }) => {
    const lineItemCustomFields = allLineItemCustomFields.filter(cf => cf.purchaseOrderLineItemUuid === uuid);

    const productVariant = productVariantById[productVariantId] ?? never('fk');
    const product = productById[productVariant.productId] ?? never('fk');

    const shopifyOrderLineItem = shopifyOrderLineItemId
      ? shopifyOrderLineItemById[shopifyOrderLineItemId] ?? never('fk')
      : null;

    const shopifyOrder = shopifyOrderLineItem ? orderById[shopifyOrderLineItem.orderId] ?? never('fk') : null;

    assertGid(productVariant.productVariantId);
    assertGid(productVariant.inventoryItemId);
    assertGid(product.productId);
    assertGidOrNull(shopifyOrderLineItemId);
    assertInt(quantity);
    assertInt(availableQuantity);
    assertMoney(unitCost);

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
          hasOnlyDefaultVariant: product.productVariantCount === 1,
          description: product.description,
          productType: product.productType,
        },
      },
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
      customFields: Object.fromEntries(lineItemCustomFields.map(({ key, value }) => [key, value])),
      unitCost,
      quantity,
      availableQuantity,
    };
  });
}

async function getPurchaseOrderCustomFields(purchaseOrderId: number) {
  const customFields = await db.purchaseOrder.getCustomFields({ purchaseOrderId });
  return Object.fromEntries(customFields.map(({ key, value }) => [key, value]));
}

async function getPurchaseOrderEmployeeAssignments(purchaseOrderId: number) {
  const employeeAssignments = await db.purchaseOrder.getAssignedEmployees({ purchaseOrderId });

  const employeeIds = employeeAssignments.map(({ employeeId }) => employeeId);
  const employees = employeeIds.length ? await db.employee.getMany({ employeeIds }) : [];
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
