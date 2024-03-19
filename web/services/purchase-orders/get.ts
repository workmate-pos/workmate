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
import { groupByKey, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { Value } from '@sinclair/typebox/value';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { Static, Type } from '@sinclair/typebox';

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
    linkedOrders: linkedOrders.map(({ orderId: id, name }) => ({ id, name })),
    linkedCustomers: linkedCustomers.map(({ customerId: id, displayName }) => ({ id, displayName })),
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

  // TODO: Only basic data
  return await Promise.all(
    names.map(({ name }) => getPurchaseOrder(session, name).then(purchaseOrder => purchaseOrder ?? never())),
  );
}

const CustomFieldFilterSchema = Type.Object({
  type: Type.Literal('require-field'),
  /**
   * The name of the field to require.
   * If null, any field is required.
   */
  key: Type.Union([Type.Null(), Type.String()]),
  /**
   * A specific value the field must contain.
   */
  value: Type.Union([Type.Null(), Type.String()]),
  /**
   * Inverses the filter.
   */
  inverse: Type.Boolean(),
});

export type CustomFieldFilter = Static<typeof CustomFieldFilterSchema>;

async function getPurchaseOrderLineItems(purchaseOrderId: number) {
  const lineItems = await db.purchaseOrder.getLineItems({ purchaseOrderId });

  const productVariantIds = unique(lineItems.map(({ productVariantId }) => productVariantId));
  const productVariants = productVariantIds.length ? await db.productVariants.getMany({ productVariantIds }) : [];
  const productVariantsById = groupByKey(productVariants, 'productVariantId');

  const productIds = unique(productVariants.map(({ productId }) => productId));
  const products = productIds.length ? await db.products.getMany({ productIds }) : [];
  const productsById = groupByKey(products, 'productId');

  return lineItems.map(({ quantity, availableQuantity, productVariantId, shopifyOrderLineItemId, unitCost }) => {
    const [productVariant = never('fk')] = productVariantsById?.[productVariantId] ?? [];
    const [product = never('fk')] = productsById?.[productVariant?.productId] ?? [];

    assertGid(productVariant.productVariantId);
    assertGid(productVariant.inventoryItemId);
    assertGid(product.productId);
    assertGidOrNull(shopifyOrderLineItemId);
    assertInt(quantity);
    assertInt(availableQuantity);
    assertMoney(unitCost);

    return {
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
        },
      },
      unitCost,
      quantity,
      availableQuantity,
      shopifyOrderLineItemId,
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
