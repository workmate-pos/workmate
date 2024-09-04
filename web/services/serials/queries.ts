import { MergeUnion } from '../../util/types.js';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { sql } from '../db/sql-tag.js';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { assertGidOrNull } from '../../util/assertions.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { SerialPaginationOptions } from '../../schemas/generated/serial-pagination-options.js';
import { isNonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';
import { nest } from '../../util/db.js';

export async function getSerial({
  serial,
  id,
  productVariantId,
  shop,
}: MergeUnion<
  | { id: number }
  | {
      shop: string;
      productVariantId: ID;
      serial: string;
    }
>) {
  const _productVariantId: string | null = productVariantId ?? null;

  const [pvs] = await sql<{
    id: number;
    shop: string;
    note: string;
    serial: string;
    productVariantId: string;
    customerId: string | null;
    locationId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "ProductVariantSerial" pvs
    WHERE pvs.id = COALESCE(${id ?? null}, pvs.id)
      AND pvs."productVariantId" = COALESCE(${_productVariantId}, pvs."productVariantId")
      AND pvs.serial = COALESCE(${serial ?? null}, pvs.serial)
      AND pvs.shop = COALESCE(${shop ?? null}, pvs.shop);
  `;

  if (!pvs) {
    return null;
  }

  return mapSerial(pvs);
}

function mapSerial(pvs: {
  id: number;
  shop: string;
  note: string;
  serial: string;
  productVariantId: string;
  customerId: string | null;
  locationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { productVariantId, customerId, locationId } = pvs;

  try {
    assertGid(productVariantId);
    assertGidOrNull(customerId);
    assertGidOrNull(locationId);

    return {
      ...pvs,
      productVariantId,
      customerId,
      locationId,
    };
  } catch (error) {
    sentryErr(error, { pvs });
    throw new HttpError('Unable to parse product variant serial', 500);
  }
}

export async function getSerialsByIds(serialIds: number[]) {
  const serials = await sql<{
    id: number;
    shop: string;
    note: string;
    serial: string;
    productVariantId: string;
    customerId: string | null;
    locationId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "ProductVariantSerial"
    WHERE "id" = ANY (${serialIds} :: int[]);
  `;

  return serials.map(mapSerial);
}

export async function getSerialsByProductVariantSerials(
  shop: string,
  serials: { productVariantId: ID; serial: string }[],
) {
  if (!isNonEmptyArray(serials)) {
    return [];
  }

  const { productVariantId, serial } = nest(serials);

  const pvs = await sql<{
    id: number;
    shop: string;
    note: string;
    serial: string;
    productVariantId: string;
    customerId: string | null;
    locationId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "ProductVariantSerial" pvs
    WHERE pvs.shop = ${shop}
      AND (pvs."productVariantId", pvs.serial) IN (SELECT *
                                                   FROM UNNEST(
                                                     ${productVariantId as string[]} :: text[],
                                                     ${serial} :: text[]
                                                        ))
  `;

  return pvs.map(serial => mapSerial(serial));
}

export async function getSerialsPage(
  shop: string,
  {
    customerId,
    locationId,
    productVariantId,
    limit,
    query,
    sort = 'created-at',
    order = 'ascending',
    offset,
  }: SerialPaginationOptions,
) {
  const _customerId: string | null = customerId ?? null;
  const _locationId: string | null = locationId ?? null;
  const _productVariantId: string | null = productVariantId ?? null;
  const _query = query || null;

  const serials = await sql<{ productVariantId: string; serial: string }>`
    SELECT pvs."productVariantId", pvs.serial
    FROM "ProductVariantSerial" pvs
           INNER JOIN "ProductVariant" pv ON pvs."productVariantId" = pv."productVariantId"
           INNER JOIN "Product" p ON pv."productId" = p."productId"
           LEFT JOIN "Customer" c ON pvs."customerId" = c."customerId"
           LEFT JOIN "Location" l ON pvs."locationId" = l."locationId"
    WHERE pvs.shop = ${shop}
      AND pvs."customerId" IS NOT DISTINCT FROM COALESCE(${_customerId}, pvs."customerId")
      AND pvs."locationId" IS NOT DISTINCT FROM COALESCE(${_locationId}, pvs."locationId")
      AND pvs."productVariantId" = COALESCE(${_productVariantId}, pvs."productVariantId")
      AND (
      p.title || ' - ' || pv.title ILIKE COALESCE(${_query}, p.title) OR
      pv.sku ILIKE COALESCE(${_query}, pv.sku) OR
      c."displayName" ILIKE COALESCE(${_query}, c."displayName") OR
      c.phone ILIKE COALESCE(${_query}, c.phone) OR
      c.email ILIKE COALESCE(${_query}, c.email) OR
      l.name ILIKE COALESCE(${_query}, l.name)
      )
    ORDER BY CASE WHEN ${order} = 'ascending' AND ${sort} = 'created-at' THEN pvs."createdAt" END ASC NULLS LAST,
             CASE WHEN ${order} = 'descending' AND ${sort} = 'created-at' THEN pvs."createdAt" END DESC NULLS LAST,
             --
             CASE WHEN ${order} = 'ascending' AND ${sort} = 'updated-at' THEN pvs."updatedAt" END ASC NULLS LAST,
             CASE WHEN ${order} = 'descending' AND ${sort} = 'updated-at' THEN pvs."updatedAt" END DESC NULLS LAST,
             --
             CASE WHEN ${order} = 'ascending' AND ${sort} = 'serial' THEN pvs.serial END ASC NULLS LAST,
             CASE WHEN ${order} = 'descending' AND ${sort} = 'serial' THEN pvs.serial END DESC NULLS LAST,
             --
             CASE WHEN ${order} = 'ascending' AND ${sort} = 'product-name' THEN p."title" END ASC NULLS LAST,
             CASE WHEN ${order} = 'descending' AND ${sort} = 'product-name' THEN p."title" END DESC NULLS LAST

    LIMIT ${limit + 1} OFFSET ${offset ?? 0};
  `;

  return {
    serials: serials
      .slice(0, limit)
      .map(({ serial, productVariantId }) => (assertGid(productVariantId), { serial, productVariantId })),
    hasNextPage: serials.length > limit,
  };
}

export async function upsertSerials(
  shop: string,
  serials: {
    serial: string;
    productVariantId: ID;
    customerId: ID | null;
    locationId: ID | null;
    note: string;
  }[],
) {
  if (!isNonEmptyArray(serials)) {
    return;
  }

  const { serial, productVariantId, customerId, locationId, note } = nest(serials);

  await sql`
    INSERT INTO "ProductVariantSerial" (shop, serial, "productVariantId", "customerId", "locationId", note)
    SELECT ${shop}, *
    FROM UNNEST(
      ${serial} :: text[],
      ${productVariantId as string[]} :: text[],
      ${customerId as string[]} :: text[],
      ${locationId as string[]} :: text[],
      ${note} :: text[]
         )
    ON CONFLICT (shop, "productVariantId", serial)
      DO UPDATE SET shop               = EXCLUDED.shop,
                    "productVariantId" = EXCLUDED."productVariantId",
                    serial             = EXCLUDED.serial,
                    "customerId"       = EXCLUDED."customerId",
                    "locationId"       = EXCLUDED."locationId",
                    note               = EXCLUDED.note
  `;
}
