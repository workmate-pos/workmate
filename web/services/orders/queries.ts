import { sql } from '../db/sql-tag.js';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { assertGidOrNull, assertMoneyOrNull } from '../../util/assertions.js';

export async function getShopifyOrderLineItem(id: ID) {
  const _id: string = id;

  const [shopifyOrderLineItem] = await sql<{
    lineItemId: string;
    orderId: string;
    productVariantId: string | null;
    title: string;
    quantity: number;
    unfulfilledQuantity: number;
    discountedUnitPrice: string;
    unitPrice: string;
    totalTax: string;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "ShopifyOrderLineItem"
    WHERE "lineItemId" = ${_id};
  `;

  if (!shopifyOrderLineItem) {
    return null;
  }

  return mapShopifyOrderLineItem(shopifyOrderLineItem);
}

function mapShopifyOrderLineItem(shopifyOrderLineItem: {
  lineItemId: string;
  orderId: string;
  productVariantId: string | null;
  title: string;
  quantity: number;
  unfulfilledQuantity: number;
  discountedUnitPrice: string;
  unitPrice: string;
  totalTax: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { orderId, lineItemId, productVariantId, discountedUnitPrice, unitPrice, totalTax } = shopifyOrderLineItem;

  assertGid(orderId);
  assertGid(lineItemId);
  assertGidOrNull(productVariantId);
  assertMoneyOrNull(discountedUnitPrice);
  assertMoneyOrNull(unitPrice);
  assertMoneyOrNull(totalTax);

  return {
    ...shopifyOrderLineItem,
    orderId,
    lineItemId,
    productVariantId,
    discountedUnitPrice,
    unitPrice,
    totalTax,
  };
}
