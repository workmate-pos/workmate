import { MergeUnion } from '../../util/types.js';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { sql } from '../db/sql-tag.js';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { isNonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';
import { nest } from '../../util/db.js';

export async function getProductVariant(productVariantId: ID) {
  const [productVariant] = await sql<{
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
    FROM "ProductVariant" pv
    WHERE "productVariantId" = ${productVariantId as string};
  `;

  if (!productVariant) {
    return null;
  }

  return mapProductVariant(productVariant);
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

export async function getProductVariants(productVariantIds: ID[]) {
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
    FROM "ProductVariant" pv
    WHERE "productVariantId" = ANY (${productVariantIds as string[]} :: text[]);
  `;

  return productVariants.map(mapProductVariant);
}

export async function upsertProductVariants(
  productVariants: {
    productVariantId: ID;
    productId: ID;
    inventoryItemId: ID;
    sku: string | null;
    title: string;
  }[],
) {
  if (!isNonEmptyArray(productVariants)) {
    return;
  }

  const { productVariantId, productId, inventoryItemId, sku, title } = nest(productVariants);

  await sql`
    INSERT INTO "ProductVariant" ("productVariantId", "productId", "inventoryItemId", sku, title)
    SELECT *
    FROM UNNEST(
      ${productVariantId as string[]} :: text[],
      ${productId as string[]} :: text[],
      ${inventoryItemId as string[]} :: text[],
      ${sku} :: text[],
      ${title} :: text[]
         )
    ON CONFLICT ("productVariantId")
      DO UPDATE
      SET "productId"       = EXCLUDED."productId",
          "inventoryItemId" = EXCLUDED."inventoryItemId",
          sku               = EXCLUDED.sku,
          title             = EXCLUDED.title;
  `;
}

export async function softDeleteProductVariants(productVariantIds: ID[]) {
  await sql`
    UPDATE "ProductVariant"
    SET "deletedAt" = NOW()
    WHERE "productVariantId" = ANY (${productVariantIds as string[]} :: text[])
      AND "deletedAt" IS NULL;
  `;
}

export async function softDeleteProductVariantsByProductIds(productIds: ID[]) {
  await sql`
    UPDATE "ProductVariant"
    SET "deletedAt" = NOW()
    WHERE "productId" = ANY (${productIds as string[]} :: text[])
      AND "deletedAt" IS NULL;
  `;
}
