import { sql } from '../db/sql-tag.js';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { assertGidOrNull, assertMoneyOrNull } from '../../util/assertions.js';
import { assertMoney } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { MergeUnion } from '../../util/types.js';

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

export async function getShopifyOrdersForSpecialOrder(specialOrderId: number) {
  const shopifyOrders = await sql<{
    orderId: string;
    shop: string;
    orderType: 'ORDER' | 'DRAFT_ORDER';
    name: string;
    customerId: string | null;
    total: string;
    outstanding: string;
    fullyPaid: boolean;
    createdAt: Date;
    updatedAt: Date;
    discount: string;
    subtotal: string;
  }>`
    SELECT so.*
    FROM "ShopifyOrder" so
           INNER JOIN "ShopifyOrderLineItem" soli ON soli."orderId" = so."orderId"
           INNER JOIN "SpecialOrderLineItem" spoli ON spoli."shopifyOrderLineItemId" = soli."lineItemId"
    WHERE spoli."specialOrderId" = ${specialOrderId}
    GROUP BY so."orderId";
  `;

  return shopifyOrders.map(mapShopifyOrder);
}

function mapShopifyOrder<
  T extends {
    orderId: string;
    shop: string;
    orderType: 'ORDER' | 'DRAFT_ORDER';
    name: string;
    customerId: string | null;
    total: string;
    outstanding: string;
    fullyPaid: boolean;
    createdAt: Date;
    updatedAt: Date;
    discount: string;
    subtotal: string;
  },
>(shopifyOrder: T) {
  const { orderId, customerId, total, outstanding, discount, subtotal } = shopifyOrder;

  try {
    assertGid(orderId);
    assertGidOrNull(customerId);
    assertMoney(total);
    assertMoney(outstanding);
    assertMoney(discount);
    assertMoney(subtotal);

    return {
      ...shopifyOrder,
      orderId,
      customerId,
      total,
      outstanding,
      discount,
      subtotal,
    };
  } catch (error) {
    sentryErr(error, { shopifyOrder });
    throw new HttpError('Unable to parse shopify order', 500);
  }
}

export async function deleteShopifyOrderLineItemsByIds(orderId: ID, lineItemIds: ID[]) {
  const _orderId: string = orderId;
  const _lineItemIds: (string | null)[] = lineItemIds;

  await sql`
    DELETE
    FROM "ShopifyOrderLineItem"
    WHERE "orderId" = ${_orderId}
      AND "lineItemId" = ANY (${_lineItemIds} :: text[]);
  `;
}

export async function getShopifyOrder({ shop, id }: { shop: string; id: ID }) {
  const [order] = await sql<{
    orderId: string;
    shop: string;
    orderType: 'ORDER' | 'DRAFT_ORDER';
    name: string;
    customerId: string | null;
    total: string;
    outstanding: string;
    fullyPaid: boolean;
    createdAt: Date;
    updatedAt: Date;
    discount: string;
    subtotal: string;
  }>`
    SELECT *
    FROM "ShopifyOrder"
    WHERE "orderId" = ${id as string}
      AND "shop" = ${shop}
  `;

  if (!order) {
    return null;
  }

  return mapShopifyOrder(order);
}

export async function getShopifyOrderLineItems(orderId: ID) {
  const lineItems = await sql<{
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
    WHERE "orderId" = ${orderId as string};
  `;

  return lineItems.map(mapShopifyOrderLineItem);
}

// TODO: Should this have locationIds filter for franchise mode?
export async function getShopifyOrdersForSerial({
  shop,
  serial,
  id,
  productVariantId,
}: MergeUnion<
  | { id: number }
  | {
      shop: string;
      serial: string;
      productVariantId: ID;
    }
>) {
  const _productVariantId: string | null = productVariantId ?? null;

  const shopifyOrders = await sql<{
    orderId: string;
    shop: string;
    orderType: 'ORDER' | 'DRAFT_ORDER';
    name: string;
    customerId: string | null;
    total: string;
    outstanding: string;
    fullyPaid: boolean;
    createdAt: Date;
    updatedAt: Date;
    discount: string;
    subtotal: string;
  }>`
    SELECT DISTINCT so.*
    FROM "ProductVariantSerial" pvs
           INNER JOIN "ShopifyOrderLineItemProductVariantSerial" lis ON lis."productVariantSerialId" = pvs.id
           INNER JOIN "ShopifyOrderLineItem" soli ON soli."lineItemId" = lis."lineItemId"
           INNER JOIN "ShopifyOrder" so ON so."orderId" = soli."orderId"
    WHERE pvs.id = COALESCE(${id ?? null}, pvs.id)
      AND pvs."productVariantId" = COALESCE(${_productVariantId}, pvs."productVariantId")
      AND pvs.serial = COALESCE(${serial ?? null}, pvs.serial)
      AND pvs.shop = COALESCE(${shop ?? null}, pvs.shop);
  `;

  return shopifyOrders.map(mapShopifyOrder);
}
