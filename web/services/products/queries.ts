import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { sql } from '../db/sql-tag.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';

export async function getProductVariants(productVariantIds: ID[]) {
  const _productVariantIds: (string | null)[] = productVariantIds;

  const productVariants = await sql<{
    productVariantId: string;
    productId: string;
    inventoryItemId: string;
    sku: string | null;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }>`
    SELECT *
    FROM "ProductVariant"
    WHERE "productVariantId" = ANY (${_productVariantIds} :: text[]);
  `;

  return productVariants.map(mapProductVariant);
}

function mapProductVariant(productVariant: {
  productVariantId: string;
  productId: string;
  inventoryItemId: string;
  sku: string | null;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) {
  const { productVariantId, productId, inventoryItemId } = productVariant;

  try {
    assertGid(productVariantId);
    assertGid(productId);
    assertGid(inventoryItemId);

    return {
      ...productVariant,
      productVariantId,
      productId,
      inventoryItemId,
    };
  } catch (error) {
    sentryErr(error, { productVariant });
    throw new HttpError('Unable to parse product variant', 500);
  }
}

export async function getProducts(productIds: ID[]) {
  const _productIds: (string | null)[] = productIds;

  const products = await sql<{
    productId: string;
    shop: string;
    handle: string;
    title: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    productType: string;
    vendor: string;
  }>`
    SELECT *
    FROM "Product"
    WHERE "productId" = ANY (${_productIds} :: text[]);
  `;

  return products.map(mapProduct);
}

function mapProduct(product: {
  productId: string;
  shop: string;
  handle: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  productType: string;
  vendor: string;
}) {
  const { productId } = product;

  try {
    assertGid(productId);

    return {
      ...product,
      productId,
    };
  } catch (error) {
    sentryErr(error, { product });
    throw new HttpError('Unable to parse product', 500);
  }
}
