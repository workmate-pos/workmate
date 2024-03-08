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
import { HttpError } from '@teifi-digital/shopify-app-express/errors/http-error.js';

export async function getPurchaseOrder(session: Session, name: string) {
  const [purchaseOrder] = await db.purchaseOrder.get({ name, shop: session.shop });

  if (!purchaseOrder) {
    throw new HttpError('Purchase order not found', 404);
  }

  assertGidOrNull(purchaseOrder.locationId);
  assertGidOrNull(purchaseOrder.customerId);
  assertGidOrNull(purchaseOrder.vendorCustomerId);
  assertGidOrNull(purchaseOrder.orderId);
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
    workOrder: getWorkOrder(purchaseOrder.workOrderId),
    order: getOrder(purchaseOrder.orderId),
    location: getLocation(purchaseOrder.locationId),
    customer: getCustomer(purchaseOrder.customerId),
    vendorCustomer: getCustomer(purchaseOrder.vendorCustomerId),
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
  const names = await db.purchaseOrder.getPage({ ...paginationOptions, shop });

  // TODO: Only basic data
  const purchaseOrders = await Promise.all(names.map(({ name }) => getPurchaseOrder(session, name)));

  return purchaseOrders;
}

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

    assertGid(productVariantId);
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

async function getWorkOrder(workOrderId: number | null) {
  if (workOrderId === null) {
    return null;
  }

  const [workOrder = never()] = await db.workOrder.get({ id: workOrderId });

  return {
    name: workOrder.name,
    customerId: workOrder.customerId,
    status: workOrder.status,
    dueDate: workOrder.dueDate,
    derivedFromOrderId: workOrder.derivedFromOrderId,
  };
}

async function getOrder(orderId: string | null) {
  if (orderId === null) {
    return null;
  }

  const [order = never()] = await db.shopifyOrder.get({ orderId });

  assertGid(orderId);

  return {
    id: orderId,
    name: order.name,
    fullyPaid: order.fullyPaid,
    type: order.orderType,
  };
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

async function getCustomer(customerId: string | null) {
  if (customerId === null) {
    return null;
  }

  const [customer = never()] = await db.customers.get({ customerId });

  assertGid(customerId);

  return {
    id: customerId,
    name: customer.displayName,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
  };
}
