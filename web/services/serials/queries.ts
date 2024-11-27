import { MergeUnion } from '../../util/types.js';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { sql } from '../db/sql-tag.js';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { assertGidOrNull } from '../../util/assertions.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { SerialPaginationOptions } from '../../schemas/generated/serial-pagination-options.js';
import { isNonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';
import { nest } from '../../util/db.js';
import { escapeLike } from '../db/like.js';

export async function getSerial({
  serial,
  id,
  productVariantId,
  shop,
  locationIds,
}: MergeUnion<
  | { id: number }
  | {
      shop: string;
      productVariantId: ID;
      serial: string;
      locationIds: ID[] | null;
    }
>) {
  const _productVariantId: string | null = productVariantId ?? null;
  const _locationIds: string[] | null = locationIds ?? null;

  const [pvs] = await sql<{
    id: number;
    shop: string;
    note: string;
    serial: string;
    productVariantId: string;
    locationId: string | null;
    createdAt: Date;
    updatedAt: Date;
    sold: boolean;
  }>`
    SELECT *
    FROM "ProductVariantSerial" pvs
    WHERE pvs.id = COALESCE(${id ?? null}, pvs.id)
      AND pvs."productVariantId" = COALESCE(${_productVariantId}, pvs."productVariantId")
      AND pvs.serial = COALESCE(${serial ?? null}, pvs.serial)
      AND pvs.shop = COALESCE(${shop ?? null}, pvs.shop)
      AND (
      "locationId" = ANY (COALESCE(${_locationIds as string[]}, ARRAY ["locationId"]))
        OR ("locationId" IS NULL AND ${_locationIds as string[]} :: text[] IS NULL)
      );
  `;

  if (!pvs) {
    return null;
  }

  return mapSerial(pvs);
}

function mapSerial<
  T extends {
    id: number;
    shop: string;
    note: string;
    serial: string;
    productVariantId: string;
    locationId: string | null;
    createdAt: Date;
    updatedAt: Date;
    sold: boolean;
  },
>(pvs: T) {
  const { productVariantId, locationId } = pvs;

  try {
    assertGid(productVariantId);
    assertGidOrNull(locationId);

    return {
      ...pvs,
      productVariantId,
      locationId,
    };
  } catch (error) {
    sentryErr(error, { pvs });
    throw new HttpError('Unable to parse product variant serial', 500);
  }
}

export async function getSerialsByIds(serialIds: number[]) {
  if (serialIds.length === 0) {
    return [];
  }

  const serials = await sql<{
    id: number;
    shop: string;
    note: string;
    serial: string;
    productVariantId: string;
    locationId: string | null;
    createdAt: Date;
    updatedAt: Date;
    sold: boolean;
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
    locationId: string | null;
    createdAt: Date;
    updatedAt: Date;
    sold: boolean;
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
    sold,
  }: SerialPaginationOptions,
  locationIds: ID[] | null,
) {
  const _customerId: string | null = customerId ?? null;
  const _locationId: string | null = locationId ?? null;
  const _productVariantId: string | null = productVariantId ?? null;
  const _query = query ? `%${escapeLike(query)}%` : null;

  const serials = await sql<{ productVariantId: string; serial: string }>`
    SELECT pvs."productVariantId", pvs.serial
    FROM "ProductVariantSerial" pvs
           INNER JOIN "ProductVariant" pv ON pvs."productVariantId" = pv."productVariantId"
           INNER JOIN "Product" p ON pv."productId" = p."productId"
           LEFT JOIN "WorkOrderItem" woi ON woi."productVariantSerialId" = pvs.id
           LEFT JOIN "WorkOrder" wo ON wo.id = woi."workOrderId"
           LEFT JOIN "Customer" c ON wo."customerId" = c."customerId"
           LEFT JOIN "Location" l ON pvs."locationId" = l."locationId"
    WHERE pvs.shop = ${shop}
      AND wo."customerId" IS NOT DISTINCT FROM COALESCE(${_customerId}, wo."customerId")
      AND pvs."locationId" IS NOT DISTINCT FROM COALESCE(${_locationId}, pvs."locationId")
      AND pvs.sold = COALESCE(${sold ?? null}, pvs.sold)
      AND (
      pvs."locationId" = ANY (COALESCE(${locationIds as string[]}, ARRAY [pvs."locationId"]))
        OR pvs."locationId" IS NULL and ${locationIds as string[]} :: text[] IS NULL
      )
      AND pvs."productVariantId" = COALESCE(${_productVariantId}, pvs."productVariantId")
      AND (
      p.title || ' - ' || pv.title ILIKE COALESCE(${_query}, p.title) OR
      pv.sku ILIKE COALESCE(${_query}, pv.sku) OR
      c."displayName" ILIKE COALESCE(${_query}, c."displayName") OR
      c.phone ILIKE COALESCE(${_query}, c.phone) OR
      c.email ILIKE COALESCE(${_query}, c.email) OR
      l.name ILIKE COALESCE(${_query}, l.name)
      )
    GROUP BY pvs.id, pvs."createdAt", pvs."updatedAt", pvs.serial, p.title
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
             CASE WHEN ${order} = 'descending' AND ${sort} = 'product-name' THEN p."title" END DESC NULLS LAST,
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
    locationId: ID;
    note: string;
    sold: boolean;
  }[],
) {
  if (!isNonEmptyArray(serials)) {
    return;
  }

  const { serial, productVariantId, locationId, note, sold } = nest(serials);

  await sql`
    INSERT INTO "ProductVariantSerial" (shop, serial, "productVariantId", "locationId", note, sold)
    SELECT ${shop}, *
    FROM UNNEST(
      ${serial} :: text[],
      ${productVariantId as string[]} :: text[],
      ${locationId as string[]} :: text[],
      ${note} :: text[],
      ${sold} :: boolean[]
         )
    ON CONFLICT (shop, "productVariantId", serial)
      DO UPDATE SET shop               = EXCLUDED.shop,
                    "productVariantId" = EXCLUDED."productVariantId",
                    serial             = EXCLUDED.serial,
                    "locationId"       = EXCLUDED."locationId",
                    note               = EXCLUDED.note,
                    sold               = EXCLUDED.sold;
  `;
}

export async function updateSerialSoldState(
  shop: string,
  serials: { serial: string; productVariantId: ID; sold: boolean }[],
) {
  if (!isNonEmptyArray(serials)) {
    return;
  }

  const { serial, productVariantId, sold } = nest(serials);
  const _productVariantId: string[] = productVariantId;

  await sql`
    UPDATE "ProductVariantSerial" pvs
    SET "sold" = x.sold
    FROM UNNEST(
      ${serial} :: text[],
      ${_productVariantId} :: text[],
      ${sold} :: boolean[]
      ) AS x(serial, "productVariantId", sold)
    WHERE pvs.shop = ${shop}
    AND pvs."serial" = x."serial"
    AND pvs."productVariantId" = x."productVariantId";
  `;
}

/**
 * Inserts line item <-> serial relationships.
 * May return fewer rows than the input if the input contains invalid serials.
 */
export async function insertLineItemSerials(shop: string, lineItemSerial: { lineItemId: ID; serial: string }[]) {
  if (!isNonEmptyArray(lineItemSerial)) {
    return;
  }

  const { lineItemId, serial } = nest(lineItemSerial);
  const _lineItemId: string[] = lineItemId;

  return await sql<{ id: number }>`
    INSERT INTO "ShopifyOrderLineItemProductVariantSerial" ("lineItemId", "productVariantSerialId")

    SELECT input."lineItemId", pvs.id
    FROM UNNEST(
           ${_lineItemId} :: text[],
           ${serial} :: text[]
         ) as input("lineItemId", "serial")
           INNER JOIN "ProductVariantSerial" pvs ON pvs.serial = input.serial
           INNER JOIN "ShopifyOrderLineItem" li ON li."lineItemId" = input."lineItemId"
           INNER JOIN "ShopifyOrder" o ON li."orderId" = o."orderId"
    WHERE pvs.shop = ${shop}
      AND o.shop = ${shop}

    RETURNING id;
  `;
}

export async function deleteLineItemSerials(shop: string, lineItemIds: ID[]) {
  if (lineItemIds.length === 0) {
    return;
  }

  const _lineItemIds: string[] = lineItemIds;

  await sql`
    DELETE
    FROM "ShopifyOrderLineItemProductVariantSerial" lis
      USING "ShopifyOrderLineItem" li
        INNER JOIN "ShopifyOrder" o ON li."orderId" = o."orderId"
    WHERE lis."lineItemId" = ANY (${_lineItemIds})
      AND li."lineItemId" = lis."lineItemId"
      AND o.shop = ${shop};
  `;
}

export async function getSerialLineItemIds(
  serials: { serial: string; productVariantId: ID }[],
  filters?: { sold?: boolean },
) {
  if (!isNonEmptyArray(serials)) {
    return [];
  }

  const { serial, productVariantId } = nest(serials);
  const _productVariantId: string[] = productVariantId;

  const lineItems = await sql<{ productVariantId: string; serial: string; lineItemId: string }>`
    SELECT pvs."productVariantId", pvs.serial, lis."lineItemId"
    FROM "ShopifyOrderLineItemProductVariantSerial" lis
           INNER JOIN "ProductVariantSerial" pvs ON pvs.id = lis."productVariantSerialId"
    WHERE (pvs."productVariantId", pvs.serial) IN (SELECT *
                                                   FROM UNNEST(
                                                     ${_productVariantId} :: text[],
                                                     ${serial} :: text[]
                                                        ))
      AND pvs.sold = COALESCE(${filters?.sold ?? null}, pvs.sold);
  `;

  return lineItems.map(({ productVariantId, ...rest }) => {
    try {
      assertGid(productVariantId);

      return {
        ...rest,
        productVariantId,
      };
    } catch (error) {
      throw new HttpError('Failed to parse serial line items', 500);
    }
  });
}

export async function getOrderLineItemSerials(orderId: ID) {
  const serials = await sql<{
    lineItemId: string;
    id: number;
    shop: string;
    note: string;
    serial: string;
    productVariantId: string;
    locationId: string | null;
    createdAt: Date;
    updatedAt: Date;
    sold: boolean;
  }>`
    SELECT lis."lineItemId", pvs.*
    FROM "ShopifyOrderLineItemProductVariantSerial" lis
           INNER JOIN "ProductVariantSerial" pvs ON pvs.id = "productVariantSerialId"
           INNER JOIN "ShopifyOrderLineItem" li ON li."lineItemId" = lis."lineItemId"
    WHERE li."orderId" = ${orderId as string};
  `;

  return serials.map(mapLineItemSerial);
}

export async function getLineItemSerials(lineItemIds: ID[]) {
  if (lineItemIds.length === 0) {
    return [];
  }

  const _lineItemIds: string[] = lineItemIds;

  const serials = await sql<{
    lineItemId: string;
    id: number;
    shop: string;
    note: string;
    serial: string;
    productVariantId: string;
    locationId: string | null;
    createdAt: Date;
    updatedAt: Date;
    sold: boolean;
  }>`
    SELECT lis."lineItemId", pvs.*
    FROM "ShopifyOrderLineItemProductVariantSerial" lis
    INNER JOIN "ProductVariantSerial" pvs ON pvs.id = "productVariantSerialId"
    WHERE "lineItemId" = ANY (${_lineItemIds})
  `;

  return serials.map(mapLineItemSerial);
}

function mapLineItemSerial(lineItemSerial: {
  lineItemId: string;
  id: number;
  shop: string;
  note: string;
  serial: string;
  productVariantId: string;
  locationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  sold: boolean;
}) {
  try {
    const { lineItemId } = lineItemSerial;

    assertGid(lineItemId);

    return mapSerial({
      ...lineItemSerial,
      lineItemId,
    });
  } catch (error) {
    throw new HttpError('Failed to parse line item serial', 400);
  }
}
