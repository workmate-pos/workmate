import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { sql, sqlOne } from '../db/sql-tag.js';
import { isNonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';
import { nest } from '../../util/db.js';
import { MergeUnion } from '../../util/types.js';
import { SupplierPaginationOptions } from '../../schemas/generated/supplier-pagination-options.js';

export type Supplier = NonNullable<Awaited<ReturnType<typeof getSupplier>>>;

export async function getSupplier(shop: string, { id, name }: MergeUnion<{ id: number } | { name: string }>) {
  const [supplier] = await sql<{ id: number; shop: string; name: string; createdAt: Date; updatedAt: Date }>`
    SELECT *
    FROM "Supplier"
    WHERE shop = ${shop}
      AND id = ${id}
      AND name = ${name};
  `;
  if (!supplier) {
    return null;
  }

  return supplier;
}

export async function getSuppliers(
  shop: string,
  {
    offset,
    query,
    sortMode = 'relevant',
    sortOrder = 'descending',
    limit,
    productVariantId,
  }: SupplierPaginationOptions,
) {
  const _productVariantId: string | null = productVariantId ?? null;

  const suppliers = await sql<{ id: number; shop: string; name: string; createdAt: Date; updatedAt: Date }>`
    SELECT s.*
    FROM "Supplier" s
           LEFT JOIN "PurchaseOrder" po ON po."supplierId" = s.id
    WHERE s.shop = ${shop}
      AND (
      s.name ILIKE COALESCE(${query ?? null}, '%') OR
      po.name ILIKE COALESCE(${query ?? null}, '%')
      )
      AND (${_productVariantId} :: text IS NULL OR EXISTS(SELECT 1
                                                          FROM "ProductVariantSupplier" pv
                                                          WHERE pv."supplierId" = s.id
                                                            AND pv."productVariantId" = ${_productVariantId}))

    GROUP BY s.id

    ORDER BY CASE WHEN ${sortMode} = 'createdAt' AND ${sortOrder} = 'ascending' THEN s."createdAt" END ASC NULLS LAST,
             CASE WHEN ${sortMode} = 'createdAt' AND ${sortOrder} = 'descending' THEN s."createdAt" END DESC NULLS LAST,
             --
             CASE WHEN ${sortMode} = 'updatedAt' AND ${sortOrder} = 'ascending' THEN s."updatedAt" END ASC NULLS LAST,
             CASE WHEN ${sortMode} = 'updatedAt' AND ${sortOrder} = 'descending' THEN s."updatedAt" END DESC NULLS LAST,
             --
             CASE WHEN ${sortMode} = 'name' AND ${sortOrder} = 'ascending' THEN s.name END ASC NULLS LAST,
             CASE WHEN ${sortMode} = 'name' AND ${sortOrder} = 'descending' THEN s.name END DESC NULLS LAST,
             --
             CASE
               WHEN ${sortMode} = 'relevant' AND ${sortOrder} = 'ascending'
                 THEN GREATEST(MAX(po."createdAt"), MAX(s."updatedAt")) END ASC NULLS LAST,
             CASE
               WHEN ${sortMode} = 'relevant' AND ${sortOrder} = 'descending'
                 THEN GREATEST(MAX(po."createdAt"), MAX(s."updatedAt")) END DESC NULLS LAST

    LIMIT ${limit + 1} OFFSET ${offset ?? null}
  `;

  return {
    suppliers: suppliers.slice(0, limit),
    hasNextPage: suppliers.length > limit,
  };
}

export async function getSupplierIds(shop: string, names: string[]) {
  if (!names.length) {
    return [];
  }

  return await sql<{ id: number; shop: string; name: string; createdAt: Date; updatedAt: Date }>`
    SELECT *
    FROM "Supplier"
    WHERE shop = ${shop}
      AND name = ANY (${names} :: text[]);
  `;
}

export async function insertSuppliers(
  shop: string,
  suppliers: {
    name: string;
  }[],
) {
  if (!isNonEmptyArray(suppliers)) {
    return [];
  }

  const { name } = nest(suppliers);

  return await sql<{ id: number; shop: string; name: string; createdAt: Date; updatedAt: Date }>`
    INSERT INTO "Supplier" (shop, name)
    SELECT ${shop}, *
    FROM UNNEST(
      ${name} :: text[]
         )
    RETURNING *;
  `;
}

/**
 * Update suppliers. May return fewer than the number of inputted suppliers in case one was not found.
 */
export async function updateSuppliers(
  shop: string,
  suppliers: {
    name: string;
  }[],
) {
  if (!isNonEmptyArray(suppliers)) {
    return [];
  }

  const { name } = nest(suppliers);

  return await sql<{ id: number; shop: string; name: string; createdAt: Date; updatedAt: Date }>`
    UPDATE "Supplier" s
    SET name = supplier.name
    FROM UNNEST(
           ${name} :: text[]
         ) supplier(name)
    WHERE s.name = supplier.name
    RETURNING *;
  `;
}

export async function deleteSuppliers(shop: string, suppliers: string[]) {
  if (suppliers.length === 0) {
    return;
  }

  await sql`
    WITH "SuppliersToDelete" AS (SELECT id
                                 FROM "Supplier"
                                 WHERE shop = ${shop}
                                   AND name = ANY (${suppliers} :: text[])),
         "UnlinkVariants" AS (
           DELETE FROM "ProductVariantSupplier"
             WHERE "supplierId" IN (SELECT id FROM "SuppliersToDelete"))
    DELETE
    FROM "Supplier"
    WHERE id IN (SELECT * FROM "SuppliersToDelete")
  `;
}

export async function upsertProductVariantSuppliers(
  productVariantSuppliers: {
    productVariantId: ID;
    supplierId: number;
  }[],
) {
  if (!isNonEmptyArray(productVariantSuppliers)) {
    return;
  }

  const { productVariantId, supplierId } = nest(productVariantSuppliers);
  const _productVariantId: string[] = productVariantId;

  await sql`
    INSERT INTO "ProductVariantSupplier" ("productVariantId", "supplierId")
    SELECT *
    FROM UNNEST(
      ${_productVariantId} :: text[],
      ${supplierId} :: int[]
         )
  `;
}

export async function deleteProductVariantSuppliers(
  productVariantSuppliers: {
    productVariantId: ID;
    supplierId: number;
  }[],
) {
  if (!isNonEmptyArray(productVariantSuppliers)) {
    return;
  }

  const { productVariantId, supplierId } = nest(productVariantSuppliers);
  const _productVariantId: string[] = productVariantId;

  await sql`
    DELETE
    FROM "ProductVariantSupplier"
    WHERE ("productVariantId", "supplierId") IN (SELECT *
                                                 FROM UNNEST(
                                                   ${_productVariantId} :: text[],
                                                   ${supplierId} :: int[]
                                                      ))
  `;
}

export async function upsertSupplier(shop: string, { id, name }: { id?: number; name: string }) {
  const supplier = await sqlOne<{ id: number; shop: string; name: string; createdAt: Date; updatedAt: Date }>`
    INSERT INTO "Supplier" (id, shop, name)
    VALUES (${id ?? null}, ${shop}, ${name})
    ON CONFLICT (shop, name) DO UPDATE SET shop = ${shop},
                                           name = ${name}
    RETURNING *;
  `;

  return supplier;
}

export async function deleteSupplier(shop: string, id: number) {
  await sql`
    DELETE
    FROM "Supplier"
    WHERE shop = ${shop}
      AND id = ${id};
  `;
}
