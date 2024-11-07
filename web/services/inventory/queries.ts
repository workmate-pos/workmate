import { isNonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';
import { nest } from '../../util/db.js';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { escapeLike } from '../db/like.js';
import { sql, sqlOne } from '../db/sql-tag.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';

export type InventoryMutationType = 'MOVE' | 'SET' | 'ADJUST';
export type InventoryMutationInitiatorType =
  | 'PURCHASE_ORDER'
  | 'PURCHASE_ORDER_RECEIPT'
  | 'STOCK_TRANSFER'
  | 'CYCLE_COUNT'
  | 'WORK_ORDER'
  | 'UNKNOWN';

export type InventoryMutation = Awaited<ReturnType<typeof getInventoryMutations>>['mutations'][number];
export type InventoryMutationItem = Awaited<ReturnType<typeof getInventoryMutationItemsForMutations>>[number];
export type DetailedInventoryMutationItem = Awaited<ReturnType<typeof getInventoryMutationItems>>['items'][number];

export async function insertInventoryMutation({
  shop,
  type,
  initiator,
}: {
  shop: string;
  type: InventoryMutationType;
  initiator?: {
    type: InventoryMutationInitiatorType;
    name: string;
  };
}) {
  return await sqlOne<{ id: number }>`
    INSERT INTO "InventoryMutation" (shop, type, "initiatorType", "initiatorName")
    VALUES (${shop},
            ${type} :: "InventoryMutationType",
            ${initiator?.type} :: "InventoryMutationInitiatorType",
            ${initiator?.name})
    RETURNING id;
  `.then(row => row.id);
}

export async function getInventoryMutations(
  shop: string,
  {
    query,
    initiator,
    type,
    inventoryItemId,
    locationIds,
    sortOrder = 'descending',
    sortMode = 'updatedAt',
    offset,
    limit,
  }: {
    query?: string;
    initiator?: {
      type: InventoryMutationInitiatorType;
      name: string;
    };
    type?: InventoryMutationType;
    inventoryItemId?: ID;
    locationIds: ID[];
    sortOrder?: 'ascending' | 'descending';
    sortMode?: 'createdAt' | 'updatedAt' | 'initiatorName' | 'initiatorType';
    offset?: number;
    limit: number;
  },
) {
  const mutations = await sql<{
    id: number;
    shop: string;
    type: 'MOVE' | 'SET' | 'ADJUST';
    initiatorType:
      | 'PURCHASE_ORDER'
      | 'STOCK_TRANSFER'
      | 'CYCLE_COUNT'
      | 'WORK_ORDER'
      | 'UNKNOWN'
      | 'PURCHASE_ORDER_RECEIPT';
    initiatorName: string;
    createdAt: Date;
    updatedAt: Date;
  }>`
      SELECT m.*
      FROM "InventoryMutation" m
      WHERE m.shop = ${shop}
        AND m.type = COALESCE(${type ?? null} :: "InventoryMutationType", m.type)
        AND m."initiatorName" ILIKE ${query ? `%${escapeLike(query)}%` : '%'}
        AND m."initiatorName" = COALESCE(${initiator?.name ?? null}, m."initiatorName")
        AND m."initiatorType" =
            COALESCE(${initiator?.type ?? null} :: "InventoryMutationInitiatorType", m."initiatorType")
        AND (${(inventoryItemId as string | undefined) ?? null} :: text IS NULL OR
             EXISTS (SELECT 1
                     FROM "InventoryMutationItem" i
                     WHERE i."inventoryMutationId" = m.id
                       AND i."inventoryItemId" = ${(inventoryItemId as string | undefined) ?? null}))
        AND (EXISTS (SELECT 1
                     FROM "InventoryMutationItem" i
                     WHERE i."inventoryMutationId" = m.id
                       AND i."locationId" = ANY (${locationIds as string[]})))
      ORDER BY CASE WHEN ${sortMode} = 'createdAt' AND ${sortOrder} = 'ascending' THEN m."createdAt" END ASC NULLS LAST,
               CASE
                   WHEN ${sortMode} = 'createdAt' AND ${sortOrder} = 'descending'
                       THEN m."createdAt" END DESC NULLS LAST,
               --
               CASE WHEN ${sortMode} = 'updatedAt' AND ${sortOrder} = 'ascending' THEN m."updatedAt" END ASC NULLS LAST,
               CASE
                   WHEN ${sortMode} = 'updatedAt' AND ${sortOrder} = 'descending'
                       THEN m."updatedAt" END DESC NULLS LAST,
               --
               CASE
                   WHEN ${sortMode} = 'initiatorName' AND ${sortOrder} = 'ascending'
                       THEN m."initiatorName" END ASC NULLS LAST,
               CASE
                   WHEN ${sortMode} = 'initiatorName' AND ${sortOrder} = 'descending'
                       THEN m."initiatorName" END DESC NULLS LAST,
               --
               CASE
                   WHEN ${sortMode} = 'initiatorType' AND ${sortOrder} = 'ascending'
                       THEN m."initiatorType" END ASC NULLS LAST,
               CASE
                   WHEN ${sortMode} = 'initiatorType' AND ${sortOrder} = 'descending'
                       THEN m."initiatorType" END DESC NULLS LAST
      LIMIT ${limit + 1} OFFSET ${offset ?? null}
  `;

  return {
    mutations: mutations.slice(0, limit),
    hasNextPage: mutations.length > limit,
  };
}

export async function getInventoryMutationItems(
  shop: string,
  {
    query,
    initiator,
    type,
    inventoryItemId,
    locationIds,
    sortOrder = 'descending',
    sortMode = 'updatedAt',
    offset,
    limit,
  }: {
    query?: string;
    initiator?: {
      type: InventoryMutationInitiatorType;
      name: string;
    };
    type?: InventoryMutationType;
    inventoryItemId?: ID;
    locationIds: ID[];
    sortOrder?: 'ascending' | 'descending';
    sortMode?: 'name' | 'createdAt' | 'updatedAt' | 'initiatorName' | 'initiatorType';
    offset?: number;
    limit: number;
  },
) {
  const items = await sql<{
    id: number;
    inventoryMutationId: number;
    inventoryItemId: string;
    name: string;
    locationId: string;
    compareQuantity: number | null;
    quantity: number | null;
    delta: number | null;
    createdAt: Date;
    updatedAt: Date;
    initiatorName: string;
    initiatorType:
      | 'PURCHASE_ORDER'
      | 'STOCK_TRANSFER'
      | 'CYCLE_COUNT'
      | 'WORK_ORDER'
      | 'UNKNOWN'
      | 'PURCHASE_ORDER_RECEIPT';
    shop: string;
    type: 'MOVE' | 'SET' | 'ADJUST';
  }>`
      WITH "DetailedInventoryMutationItem" AS (SELECT i.*, m."initiatorName", m."initiatorType", m.shop, m.type
                                               FROM "InventoryMutationItem" i
                                                        INNER JOIN "InventoryMutation" m ON i."inventoryMutationId" = m.id
                                               LIMIT ${limit + 1} OFFSET ${offset ?? null})
      SELECT *
      FROM "DetailedInventoryMutationItem" i
      WHERE i.shop = ${shop}
        AND i.type = COALESCE(${type ?? null} :: "InventoryMutationType", i.type)
        AND i."initiatorName" ILIKE ${query ? `%${escapeLike(query)}%` : '%'}
        AND i."initiatorName" = COALESCE(${initiator?.name ?? null}, i."initiatorName")
        AND i."initiatorType" =
            COALESCE(${initiator?.type ?? null} :: "InventoryMutationInitiatorType", i."initiatorType")
        AND i."inventoryItemId" = COALESCE(${inventoryItemId ?? null}, i."inventoryItemId")
        AND i."locationId" = ANY (${locationIds as string[]})
      ORDER BY CASE WHEN ${sortMode} = 'createdAt' AND ${sortOrder} = 'ascending' THEN i."createdAt" END ASC NULLS LAST,
               CASE WHEN ${sortMode} = 'createdAt' AND ${sortOrder} = 'descending' THEN i."createdAt" END DESC NULLS LAST,
               --
               CASE WHEN ${sortMode} = 'updatedAt' AND ${sortOrder} = 'ascending' THEN i."updatedAt" END ASC NULLS LAST,
               CASE WHEN ${sortMode} = 'updatedAt' AND ${sortOrder} = 'descending' THEN i."updatedAt" END DESC NULLS LAST,
               --
               CASE WHEN ${sortMode} = 'initiatorName' AND ${sortOrder} = 'ascending' THEN i."initiatorName" END ASC NULLS LAST,
               CASE WHEN ${sortMode} = 'initiatorName' AND ${sortOrder} = 'descending' THEN i."initiatorName" END DESC NULLS LAST,
               --
               CASE WHEN ${sortMode} = 'initiatorType' AND ${sortOrder} = 'ascending' THEN i."initiatorType" END ASC NULLS LAST,
               CASE WHEN ${sortMode} = 'initiatorType' AND ${sortOrder} = 'descending' THEN i."initiatorType" END DESC NULLS LAST
      LIMIT ${limit + 1} OFFSET ${offset ?? null};
  `;

  return {
    items: items.slice(0, limit).map(({ inventoryItemId, locationId, ...item }) => {
      try {
        assertGid(inventoryItemId);
        assertGid(locationId);

        return {
          ...item,
          inventoryItemId,
          locationId,
        };
      } catch (e) {
        throw new Error('Failed to parse inventory mutation item', { cause: e });
      }
    }),
    hasNextPage: items.length > limit,
  };
}

export async function getInventoryMutationItemsForMutations({
  inventoryMutationIds,
}: {
  inventoryMutationIds: number[];
}) {
  if (!inventoryMutationIds.length) {
    return [];
  }

  return await sql<{
    id: number;
    inventoryMutationId: number;
    inventoryItemId: string;
    name: string;
    locationId: string;
    compareQuantity: number | null;
    quantity: number | null;
    delta: number | null;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "InventoryMutationItem"
    WHERE "inventoryMutationId" = ANY (${inventoryMutationIds})
    ORDER BY "updatedAt" ASC;
  `.then(items =>
    items.map(({ inventoryItemId, locationId, ...item }) => {
      try {
        assertGid(inventoryItemId);
        assertGid(locationId);

        return {
          ...item,
          inventoryItemId,
          locationId,
        };
      } catch (error) {
        sentryErr(error, { item });
        throw new HttpError('Failed to parse inventory mutation item', 500);
      }
    }),
  );
}

export async function insertInventoryMutationItems(
  items: {
    inventoryMutationId: number;
    inventoryItemId: ID;
    quantityName: string;
    locationId: ID;
    compareQuantity: number | null;
    quantity: number | null;
    delta: number | null;
  }[],
) {
  if (!isNonEmptyArray(items)) {
    return;
  }

  const { inventoryMutationId, inventoryItemId, quantity, locationId, compareQuantity, quantityName, delta } =
    nest(items);

  await sql`
    INSERT INTO "InventoryMutationItem" ("inventoryMutationId", "inventoryItemId", name, "locationId",
                                         "compareQuantity", quantity, delta)
    SELECT *
    FROM UNNEST(
      ${inventoryMutationId} :: int[],
      ${inventoryItemId as string[]} :: text[],
      ${quantityName} :: text[],
      ${locationId as string[]} :: text[],
      ${compareQuantity} :: int[],
      ${quantity} :: int[],
      ${delta} :: int[]
         );

  `;
}

export async function upsertInventoryQuantities(
  shop: string,
  items: {
    inventoryItemId: ID;
    locationId: ID;
    name: string;
    quantity: number;
  }[],
) {
  if (!isNonEmptyArray(items)) {
    return;
  }

  const { inventoryItemId, locationId, name, quantity } = nest(items);

  const _inventoryItemId: string[] = inventoryItemId;
  const _locationId: string[] = locationId;

  await sql`
    INSERT INTO "InventoryQuantity" (shop, "inventoryItemId", "locationId", name, quantity)
    SELECT ${shop}, *
    FROM UNNEST(
      ${_inventoryItemId} :: text[],
      ${_locationId} :: text[],
      ${name} :: text[],
      ${quantity} :: int[]
         )
    ON CONFLICT ("shop", "locationId", "inventoryItemId", name) DO UPDATE
      SET "quantity" = EXCLUDED.quantity;
  `;
}
