import { sql, sqlOne } from '../db/sql-tag.js';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { nest } from '../../util/db.js';
import { isNonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';
import { escapeLike } from '../db/like.js';

export type CycleCount = NonNullable<Awaited<ReturnType<typeof getCycleCount>>>;
export type CycleCountItem = Awaited<ReturnType<typeof getCycleCountItems>>[number];

export async function getCycleCount({ shop, name }: { shop: string; name: string }) {
  const [cycleCount] = await sql<{
    id: number;
    status: string;
    locationId: string;
    note: string;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    shop: string;
  }>`
    SELECT *
    FROM "CycleCount"
    WHERE shop = ${shop}
      AND name = ${name};`;

  if (!cycleCount) {
    return null;
  }

  return mapCycleCount(cycleCount);
}

function mapCycleCount(cycleCount: {
  id: number;
  status: string;
  locationId: string;
  note: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  shop: string;
}) {
  const { locationId } = cycleCount;

  assertGid(locationId);

  return {
    ...cycleCount,
    locationId,
  };
}

export async function getCycleCountsPage(
  shop: string,
  {
    query,
    status,
    offset,
    limit,
    locationId,
  }: { query?: string; status?: string; limit: number; offset: number; locationId?: ID },
) {
  const escapedQuery = query ? `%${escapeLike(query)}%` : undefined;
  const _locationId: string | undefined = locationId;

  const cycleCounts = await sql<{
    id: number;
    shop: string;
    name: string;
    status: string;
    locationId: string;
    note: string;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "CycleCount"
    WHERE shop = ${shop}
      AND (
      status = COALESCE(${status ?? null}, status) OR
      name ILIKE COALESCE(${escapedQuery ?? null}, name) OR
      note ILIKE COALESCE(${escapedQuery ?? null}, note)
      )
      AND "locationId" = COALESCE(${_locationId ?? null}, "locationId")
    ORDER BY id DESC
    LIMIT ${limit} OFFSET ${offset};
  `;

  return cycleCounts.map(mapCycleCount);
}

export async function upsertCycleCount({
  locationId,
  note,
  status,
  name,
  shop,
}: {
  shop: string;
  name: string;
  status: string;
  locationId: ID;
  note: string;
}) {
  const _locationId: string = locationId;

  const cycleCount = await sqlOne<{
    id: number;
    status: string;
    locationId: string;
    note: string;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    shop: string;
  }>`
    INSERT INTO "CycleCount" (status, "locationId", note, name, shop)
    VALUES (${status}, ${_locationId}, ${note}, ${name}, ${shop})
    ON CONFLICT (shop, name)
      DO UPDATE SET status       = EXCLUDED.status,
                    "locationId" = EXCLUDED."locationId",
                    note         = EXCLUDED.note
    RETURNING *;`;

  return mapCycleCount(cycleCount);
}

export async function removeCycleCountItemsByUuid(cycleCountId: number, uuids: string[]) {
  await sql`
    DELETE
    FROM "CycleCountItem"
    WHERE "cycleCountId" = ${cycleCountId}
      AND uuid = ANY (${uuids} :: uuid[]);`;
}

export async function upsertCycleCountItems(
  cycleCountId: number,
  items: {
    uuid: string;
    productVariantId: ID;
    inventoryItemId: ID;
    countQuantity: number;
    productTitle: string;
    productVariantTitle: string;
  }[],
) {
  if (!isNonEmptyArray(items)) {
    return;
  }

  const { uuid, productTitle, productVariantTitle, productVariantId, inventoryItemId, countQuantity } = nest(items);
  const _productVariantId: string[] = productVariantId;
  const _inventoryItemId: string[] = inventoryItemId;

  await sql`
    INSERT INTO "CycleCountItem" ("cycleCountId", uuid, "productVariantId", "inventoryItemId", "countQuantity",
                                  "productTitle", "productVariantTitle")
    SELECT ${cycleCountId}, *
    FROM UNNEST(
      ${uuid} :: uuid[],
      ${_productVariantId} :: text[],
      ${_inventoryItemId} :: text[],
      ${countQuantity} :: int[],
      ${productTitle} :: text[],
      ${productVariantTitle} :: text[]
         )
    ON CONFLICT ("cycleCountId", uuid)
      DO UPDATE SET "productVariantId"    = EXCLUDED."productVariantId",
                    "inventoryItemId"     = EXCLUDED."inventoryItemId",
                    "countQuantity"       = EXCLUDED."countQuantity",
                    "productTitle"        = EXCLUDED."productTitle",
                    "productVariantTitle" = EXCLUDED."productVariantTitle";`;
}

export async function createCycleCountItemApplications(
  cycleCountId: number,
  applications: {
    cycleCountItemUuid: string;
    appliedQuantity: number;
    originalQuantity: number;
  }[],
) {
  if (!isNonEmptyArray(applications)) {
    return;
  }

  const { originalQuantity, cycleCountItemUuid, appliedQuantity } = nest(applications);

  await sql`
    INSERT INTO "CycleCountItemApplication" ("cycleCountId", "cycleCountItemUuid", "appliedQuantity",
                                             "originalQuantity")
    SELECT ${cycleCountId}, *
    FROM UNNEST(
      ${cycleCountItemUuid} :: uuid[],
      ${appliedQuantity} :: int[],
      ${originalQuantity} :: int[]
         );`;
}

export async function getCycleCountItems(cycleCountId: number) {
  const items = await sql<{
    cycleCountId: number;
    uuid: string;
    productVariantId: string;
    inventoryItemId: string;
    countQuantity: number;
    productTitle: string;
    productVariantTitle: string;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "CycleCountItem"
    WHERE "cycleCountId" = ${cycleCountId};`;

  return items.map(mapCycleCountItem);
}

function mapCycleCountItem(item: {
  cycleCountId: number;
  uuid: string;
  productVariantId: string;
  inventoryItemId: string;
  countQuantity: number;
  productTitle: string;
  productVariantTitle: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { productVariantId, inventoryItemId } = item;

  assertGid(productVariantId);
  assertGid(inventoryItemId);

  return {
    ...item,
    productVariantId,
    inventoryItemId,
  };
}

export async function getCycleCountItemApplications(cycleCountId: number) {
  return await sql<{
    id: number;
    cycleCountItemUuid: string;
    cycleCountId: number;
    appliedQuantity: number;
    originalQuantity: number;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "CycleCountItemApplication"
    WHERE "cycleCountId" = ${cycleCountId};`;
}
