import { Session } from '@shopify/shopify-api';
import { PurchaseOrder, PurchaseOrderInfo } from './types.js';
import { escapeLike } from '../db/like.js';
import { db } from '../db/db.js';
import { PurchaseOrderPaginationOptions } from '../../schemas/generated/purchase-order-pagination-options.js';
import { assertGidOrNull, assertInt } from '../../util/assertions.js';
import { assertGid } from '@teifi-digital/shopify-app-toolbox/shopify';

export async function getPurchaseOrder(session: Session, name: string): Promise<PurchaseOrder | null> {
  const [purchaseOrder] = await db.purchaseOrder.get({ name, shop: session.shop });

  if (!purchaseOrder) {
    return null;
  }

  assertGidOrNull(purchaseOrder.locationId);
  assertGidOrNull(purchaseOrder.customerId);
  assertGidOrNull(purchaseOrder.vendorCustomerId);

  const products = await getPurchaseOrderProducts(purchaseOrder.id);
  const customFields = await getPurchaseOrderCustomFields(purchaseOrder.id);

  return {
    name: purchaseOrder.name,
    status: purchaseOrder.status,
    salesOrderId: purchaseOrder.salesOrderId,
    workOrderId: purchaseOrder.workOrderId,
    locationId: purchaseOrder.locationId,
    customerId: purchaseOrder.customerId,
    vendorCustomerId: purchaseOrder.vendorCustomerId,
    shipFrom: purchaseOrder.shipFrom,
    shipTo: purchaseOrder.shipTo,
    note: purchaseOrder.note,
    vendorName: purchaseOrder.vendorName,
    customerName: purchaseOrder.customerName,
    locationName: purchaseOrder.locationName,
    customFields,
    products,
  };
}

export async function getPurchaseOrderInfoPage(
  { shop }: Session,
  paginationOptions: PurchaseOrderPaginationOptions,
): Promise<PurchaseOrderInfo[]> {
  if (paginationOptions.query) {
    paginationOptions.query = `%${escapeLike(paginationOptions.query)}%`;
  }

  return await db.purchaseOrder.getPage({ ...paginationOptions, shop });
}

async function getPurchaseOrderProducts(purchaseOrderId: number) {
  const products = await db.purchaseOrder.getProducts({ purchaseOrderId });
  return products.map(({ productVariantId, quantity, ...product }) => {
    assertGid(productVariantId);
    assertInt(quantity);
    return { ...product, productVariantId, quantity };
  });
}

async function getPurchaseOrderCustomFields(purchaseOrderId: number) {
  const result: Record<string, string> = {};

  const customFields = await db.purchaseOrder.getCustomFields({ purchaseOrderId });

  for (const { key, value } of customFields) {
    if (key in customFields) {
      throw new Error(`Duplicate custom field key: ${key}`);
    }

    result[key] = value;
  }

  return result;
}
