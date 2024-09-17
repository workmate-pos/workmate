import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { sql } from '../db/sql-tag.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { nest } from '../../util/db.js';
import { isNonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';

export async function getProduct(productId: ID) {
  const [product] = await sql<{
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
    hasOnlyDefaultVariant: boolean;
  }>`
    SELECT *
    FROM "Product"
    WHERE "productId" = ${productId as string};
  `;

  if (!product) {
    return null;
  }

  return mapProduct(product);
}

export async function getProducts(productIds: ID[]) {
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
    hasOnlyDefaultVariant: boolean;
  }>`
    SELECT *
    FROM "Product"
    WHERE "productId" = ANY (${productIds as string[]} :: text[]);
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
  hasOnlyDefaultVariant: boolean;
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

export async function upsertProducts(
  products: {
    productId: ID;
    shop: string;
    handle: string;
    title: string;
    description: string;
    productType: string;
    vendor: string;
    hasOnlyDefaultVariant: boolean;
  }[],
) {
  if (!isNonEmptyArray(products)) {
    return;
  }

  const { productId, shop, handle, title, description, productType, vendor, hasOnlyDefaultVariant } = nest(products);

  await sql`
    INSERT INTO "Product" ("productId", shop, handle, title, description, "productType", vendor,
                           "hasOnlyDefaultVariant")
    SELECT *
    FROM UNNEST(
      ${productId as string[]} :: text[],
      ${shop} :: text[],
      ${handle} :: text[],
      ${title} :: text[],
      ${description} :: text[],
      ${productType} :: text[],
      ${vendor} :: text[],
      ${hasOnlyDefaultVariant} :: boolean[]
         )
    ON CONFLICT ("productId")
      DO UPDATE
      SET shop                    = EXCLUDED.shop,
          handle                  = EXCLUDED.handle,
          title                   = EXCLUDED.title,
          description             = EXCLUDED.description,
          "productType"           = EXCLUDED."productType",
          vendor                  = EXCLUDED.vendor,
          "hasOnlyDefaultVariant" = EXCLUDED."hasOnlyDefaultVariant";
  `;
}

export async function softDeleteProducts(productIds: ID[]) {
  await sql`
    UPDATE "Product"
    SET "deletedAt" = NOW()
    WHERE "productId" = ANY (${productIds as string[]} :: text[])
      AND "deletedAt" IS NULL;
  `;
}
