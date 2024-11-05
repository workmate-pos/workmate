import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { sql } from '../db/sql-tag.js';
import { isNonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';
import { nest } from '../../util/db.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { assertGidOrNull } from '../../util/assertions.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { MergeUnion } from '../../util/types.js';

export type ReorderPoint = Awaited<ReturnType<typeof getReorderPoints>>[number];

export async function getReorderPoints({
  shop,
  locationIds,
  inventoryItemIds,
}: { shop: string } & MergeUnion<{ locationIds: ID[] } | { inventoryItemIds: ID[] }>) {
  const _locationIds: string[] | null = locationIds ?? null;
  const _inventoryItemIds: string[] | null = inventoryItemIds ?? null;

  const result = await sql<{
    id: number;
    shop: string;
    inventoryItemId: string;
    locationId: string | null;
    min: number;
    max: number;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "ReorderPoint"
    WHERE "shop" = ${shop}
      AND (${_locationIds!} :: text[] IS NULL OR "locationId" IS NULL OR
           "locationId" = ANY (${_locationIds!} :: text[]))
      AND (${_inventoryItemIds!} :: text[] IS NULL OR
           "inventoryItemId" = ANY (${_inventoryItemIds!} :: text[]))
  `;

  return result.map(mapReorderPoint);
}

function mapReorderPoint(row: {
  id: number;
  shop: string;
  inventoryItemId: string;
  locationId: string | null;
  min: number;
  max: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { inventoryItemId, locationId } = row;

  try {
    assertGid(inventoryItemId);
    assertGidOrNull(locationId);

    return {
      ...row,
      inventoryItemId,
      locationId,
    };
  } catch (e) {
    throw new HttpError('Failed to parse reorder point', 500);
  }
}

export async function upsertReorderPoints(
  shop: string,
  reorderPoints: {
    locationId: ID | null;
    inventoryItemId: ID;
    min: number;
    max: number;
  }[],
) {
  if (!isNonEmptyArray(reorderPoints)) {
    return;
  }

  const { locationId, inventoryItemId, min, max } = nest(reorderPoints);

  const _inventoryItemId: string[] = inventoryItemId;
  const _locationId: (string | null)[] = locationId;

  await sql`
    INSERT INTO "ReorderPoint" (shop, "inventoryItemId", "locationId", min, max)
    SELECT ${shop}, *
    FROM UNNEST(
      ${_inventoryItemId} :: text[],
      ${_locationId} :: text[],
      ${min} :: int[],
      ${max} :: int[]
    )
    ON CONFLICT (shop, "locationId", "inventoryItemId")
    DO UPDATE SET
      min = EXCLUDED.min,
      max = EXCLUDED.max
  `;
}

export async function deleteReorderPoints(
  shop: string,
  reorderPoints: {
    locationId: ID | null;
    inventoryItemId: ID;
  }[],
) {
  if (!isNonEmptyArray(reorderPoints)) {
    return;
  }

  const { locationId, inventoryItemId } = nest(reorderPoints);

  const _inventoryItemId: string[] = inventoryItemId;
  const _locationId: (string | null)[] = locationId;

  await sql`
    DELETE
    FROM "ReorderPoint" p
    WHERE shop = ${shop}
      AND EXISTS (SELECT 1
                  FROM UNNEST(
                         ${_inventoryItemId} :: text[],
                         ${_locationId} :: text[]
                       ) i("inventoryItemId", "locationId")
                  WHERE i."inventoryItemId" = p."inventoryItemId"
                    AND i."locationId" IS NOT DISTINCT FROM p."locationId")
  `;
}

/**
 * Plan reorder quantities for a given location.
 * Uses available + incoming inventory quantities to determine how much to order.
 */
export async function getReorderQuantities(shop: string, locationId: ID) {
  const _locationId: string = locationId;

  const reorders = await sql<{ vendor: string; inventoryItemId: string; quantity: number | null }>`
    SELECT p.vendor, rp."inventoryItemId", rp.max - available.quantity - incoming.quantity AS "quantity"
    FROM "ReorderPoint" rp
           INNER JOIN "ProductVariant" pv ON rp."inventoryItemId" = pv."inventoryItemId"
           INNER JOIN "Product" p on pv."productId" = p."productId"
           INNER JOIN "InventoryQuantity" available
                      ON available."inventoryItemId" = rp."inventoryItemId" AND available.name = 'available'
           INNER JOIN "InventoryQuantity" incoming
                      ON incoming."inventoryItemId" = rp."inventoryItemId" AND incoming.name = 'incoming'
    WHERE rp.shop = ${shop}
      AND available.quantity + incoming.quantity < rp.min
      AND (
      -- Take reorder point for current location
      -- OR
      -- Take reorder point for ALL locations if there is none for current
      rp."locationId" = ${_locationId} OR (
        rp."locationId" IS NULL AND
        NOT EXISTS (SELECT 1
                    FROM "ReorderPoint" rp2
                    WHERE rp2.shop = ${shop}
                      AND rp2."locationId" = ${_locationId})
        )
      );
  `;

  return reorders.map(({ inventoryItemId, quantity, ...reorderPoint }) => {
    try {
      assertGid(inventoryItemId);

      return {
        ...reorderPoint,
        quantity: quantity ?? never('all columns are non nullable'),
        inventoryItemId,
      };
    } catch (e) {
      throw new HttpError('Failed to parse reorder point', 500);
    }
  });
}
