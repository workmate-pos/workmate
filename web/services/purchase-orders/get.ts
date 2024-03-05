import { Session } from '@shopify/shopify-api';
import { PurchaseOrder, PurchaseOrderInfo } from './types.js';
import { escapeLike } from '../db/like.js';
import { db } from '../db/db.js';
import { PurchaseOrderPaginationOptions } from '../../schemas/generated/purchase-order-pagination-options.js';
import { assertGidOrNull, assertInt, assertMoneyOrNull } from '../../util/assertions.js';
import { assertGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { assertMoney } from '@teifi-digital/shopify-app-toolbox/big-decimal';

export async function getPurchaseOrder(session: Session, name: string): Promise<PurchaseOrder | null> {
  const [purchaseOrder] = await db.purchaseOrder.get({ name, shop: session.shop });

  if (!purchaseOrder) {
    return null;
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

  const products = await getPurchaseOrderProducts(purchaseOrder.id);
  const customFields = await getPurchaseOrderCustomFields(purchaseOrder.id);
  const employeeAssignments = await getPurchaseOrderEmployeeAssignments(purchaseOrder.id);

  return {
    name: purchaseOrder.name,
    status: purchaseOrder.status,
    orderId: purchaseOrder.orderId,
    orderName: purchaseOrder.orderName,
    workOrderName: purchaseOrder.workOrderName,
    locationId: purchaseOrder.locationId,
    customerId: purchaseOrder.customerId,
    vendorCustomerId: purchaseOrder.vendorCustomerId,
    shipFrom: purchaseOrder.shipFrom,
    shipTo: purchaseOrder.shipTo,
    note: purchaseOrder.note,
    vendorName: purchaseOrder.vendorName,
    customerName: purchaseOrder.customerName,
    locationName: purchaseOrder.locationName,
    discount: purchaseOrder.discount,
    tax: purchaseOrder.tax,
    shipping: purchaseOrder.shipping,
    deposited: purchaseOrder.deposited,
    paid: purchaseOrder.paid,
    customFields,
    products,
    employeeAssignments,
  };
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

  const purchaseOrders = await Promise.all(names.map(({ name }) => getPurchaseOrder(session, name)));

  return purchaseOrders.map(purchaseOrder => {
    const { name, ...rest } = purchaseOrder ?? never();
    return { name: name ?? never(), ...rest };
  });
}

async function getPurchaseOrderProducts(purchaseOrderId: number) {
  const products = await db.purchaseOrder.getProducts({ purchaseOrderId });
  return products.map<PurchaseOrder['products'][number]>(
    ({ productVariantId, inventoryItemId, quantity, availableQuantity, name, sku, handle, unitCost }) => {
      assertGid(productVariantId);
      assertGid(inventoryItemId);
      assertInt(quantity);
      assertInt(availableQuantity);
      assertMoney(unitCost);
      return { productVariantId, inventoryItemId, quantity, availableQuantity, name, sku, handle, unitCost };
    },
  );
}

async function getPurchaseOrderCustomFields(purchaseOrderId: number) {
  const customFields = await db.purchaseOrder.getCustomFields({ purchaseOrderId });
  return Object.fromEntries(customFields.map(({ key, value }) => [key, value]));
}

async function getPurchaseOrderEmployeeAssignments(purchaseOrderId: number) {
  const employeeAssignments = await db.purchaseOrder.getAssignedEmployees({ purchaseOrderId });
  return employeeAssignments.map<PurchaseOrder['employeeAssignments'][number]>(({ employeeId, employeeName }) => {
    assertGid(employeeId);
    return { employeeId, employeeName };
  });
}
