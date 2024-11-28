import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { sql, sqlOne } from '../db/sql-tag.js';
import { isNonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';
import { nest } from '../../util/db.js';
import { MergeUnion } from '../../util/types.js';
import { SupplierPaginationOptions } from '../../schemas/generated/supplier-pagination-options.js';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { escapeLike } from '../db/like.js';

export type Supplier = NonNullable<Awaited<ReturnType<typeof getSupplier>>>;

export async function getSupplier(shop: string, { id, name }: MergeUnion<{ id: number } | { name: string }>) {
  const [supplier] = await sql<{
    id: number;
    shop: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    address: string | null;
    lastUsedAt: Date | null;
  }>`
    SELECT s.*, GREATEST(MAX(po."createdAt"), s."updatedAt") AS "lastUsedAt"
    FROM "Supplier" s
           LEFT JOIN "PurchaseOrder" po ON po."supplierId" = s.id
    WHERE s.shop = ${shop}
      AND s.id = COALESCE(${id ?? null}, s.id)
      AND s.name = COALESCE(${name ?? null}, s.name)
    GROUP BY s.id;
  `;
  if (!supplier) {
    return null;
  }

  return supplier;
}

export async function setSupplierVendors(supplierId: number, vendors: string[]) {
  await sql`
      WITH "Inserted" AS (
          INSERT INTO "SupplierVendor" ("supplierId", "vendor")
              SELECT ${supplierId}, *
              FROM UNNEST(${vendors} :: text[])
              -- We must use DO UPDATE to include this row in the result set
              ON CONFLICT ("supplierId", vendor) DO UPDATE
                  SET "supplierId" = EXCLUDED."supplierId"
              RETURNING vendor)
      DELETE
      FROM "SupplierVendor"
      WHERE "supplierId" = ${supplierId}
        AND vendor NOT IN (SELECT vendor FROM "Inserted");
  `;
}

export async function getSuppliers(
  shop: string,
  { offset, query, sortMode = 'relevant', sortOrder = 'descending', limit, vendor }: SupplierPaginationOptions,
) {
  const _vendor: string[] | null = vendor?.length ? vendor : null;
  const _query = query ? escapeLike(query) : null;

  const suppliers = await sql<{ id: number }>`
      SELECT s.id
      FROM "Supplier" s
               LEFT JOIN "PurchaseOrder" po ON po."supplierId" = s.id
               LEFT JOIN "SupplierVendor" sv ON sv."supplierId" = s.id
      WHERE s.shop = ${shop}
        AND (
          s.name ILIKE COALESCE(${_query}, '%') OR
          po.name ILIKE COALESCE(${_query}, '%') OR
          sv.vendor ILIKE COALESCE(${_query}, '%')
          )
        AND (${_vendor!} :: text[] IS NULL OR sv.vendor = ANY (${_vendor!}))
      GROUP BY s.id
      ORDER BY CASE WHEN ${sortMode} = 'createdAt' AND ${sortOrder} = 'ascending' THEN s."createdAt" END ASC,
               CASE WHEN ${sortMode} = 'createdAt' AND ${sortOrder} = 'descending' THEN s."createdAt" END DESC,
               --
               CASE WHEN ${sortMode} = 'updatedAt' AND ${sortOrder} = 'ascending' THEN s."updatedAt" END ASC,
               CASE WHEN ${sortMode} = 'updatedAt' AND ${sortOrder} = 'descending' THEN s."updatedAt" END DESC,
               --
               CASE WHEN ${sortMode} = 'name' AND ${sortOrder} = 'ascending' THEN s.name END ASC,
               CASE WHEN ${sortMode} = 'name' AND ${sortOrder} = 'descending' THEN s.name END DESC,
               --
               CASE
                   WHEN ${sortMode} = 'relevant' AND ${sortOrder} = 'ascending'
                       THEN GREATEST(MAX(po."createdAt"), s."updatedAt") END ASC,
               CASE
                   WHEN ${sortMode} = 'relevant' AND ${sortOrder} = 'descending'
                       THEN GREATEST(MAX(po."createdAt"), s."updatedAt") END DESC,
               -- Tie breaker
               CASE WHEN ${sortOrder} = 'ascending' THEN s.name END ASC,
               CASE WHEN ${sortOrder} = 'descending' THEN s.name END DESC

      LIMIT ${limit + 1} OFFSET ${offset ?? null}
  `;

  return {
    suppliers: suppliers.slice(0, limit),
    hasNextPage: suppliers.length > limit,
  };
}

export async function insertSupplier(shop: string, { name, address }: { name: string; address?: string }) {
  return await sqlOne<{
    id: number;
    shop: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    address: string | null;
  }>`
    INSERT INTO "Supplier" (shop, name, address)
    VALUES (${shop}, ${name}, ${address?.trim() || null})
    RETURNING *;
  `;
}

export async function updateSupplier(
  shop: string,
  { id, name, address }: { id: number; name: string; address?: string },
) {
  return await sqlOne<{
    id: number;
    shop: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    address: string | null;
  }>`
    UPDATE "Supplier"
    SET shop    = ${shop},
        name    = ${name},
        address = ${address?.trim() || null}
    WHERE id = ${id}
    RETURNING *;
  `;
}

export async function deleteSupplier(shop: string, id: number) {
  await sql`
    DELETE
    FROM "Supplier"
    WHERE shop = ${shop}
      AND id = ${id};
  `;
}

export async function getSupplierVendors(supplierId: number) {
  return await sql<{ id: number; supplierId: number; vendor: string; createdAt: Date; updatedAt: Date }>`
    SELECT *
    FROM "SupplierVendor"
    WHERE "supplierId" = ${supplierId};
  `;
}

function mapSupplierProductVariants(supplierProductVariants: {
  id: number;
  supplierId: number;
  productVariantId: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { productVariantId } = supplierProductVariants;

  try {
    assertGid(productVariantId);

    return {
      ...supplierProductVariants,
      productVariantId,
    };
  } catch (error) {
    sentryErr(error, { supplierProductVariants });
    throw new HttpError('Unable to parse supplier product variant', 500);
  }
}
