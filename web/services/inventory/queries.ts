import { isNonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';
import { nest } from '../../util/db.js';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { escapeLike } from '../db/like.js';
import { sql, sqlOne } from '../db/sql-tag.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { assertGidOrNull } from '../../util/assertions.js';

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
  staffMemberId,
}: {
  shop: string;
  type: InventoryMutationType;
  initiator?: {
    type: InventoryMutationInitiatorType;
    name: string;
  };
  staffMemberId: ID | null;
}) {
  return await sqlOne<{ id: number }>`
      INSERT INTO "InventoryMutation" (shop, type, "initiatorType", "initiatorName", "staffMemberId")
      VALUES (${shop},
              ${type} :: "InventoryMutationType",
              ${initiator?.type} :: "InventoryMutationInitiatorType",
              ${initiator?.name},
              ${staffMemberId as string | null})
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
    staffMemberId: string | null;
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
    sortMode?:
      | 'name'
      | 'createdAt'
      | 'updatedAt'
      | 'initiatorName'
      | 'initiatorType'
      | 'locationId'
      | 'staffMemberId'
      | 'inventoryItemId'
      | 'available'
      | 'incoming'
      | 'reserved';
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
    staffMemberId: string | null;
  }>`
      WITH "DetailedInventoryMutationItem" AS (SELECT i.*,
                                                      m."initiatorName",
                                                      m."initiatorType",
                                                      m.shop,
                                                      m.type,
                                                      m."staffMemberId"
                                               FROM "InventoryMutationItem" i
                                                        INNER JOIN "InventoryMutation" m ON i."inventoryMutationId" = m.id)
      SELECT *
      FROM "DetailedInventoryMutationItem" i
      WHERE i.shop = ${shop}
        AND i.type = COALESCE(${type ?? null} :: "InventoryMutationType", i.type)
        AND i."initiatorName" ILIKE ${query ? `%${escapeLike(query)}%` : '%'}
        AND i."initiatorName" = COALESCE(${initiator?.name ?? null}, i."initiatorName")
        AND i."initiatorType" =
            COALESCE(${initiator?.type ?? null} :: "InventoryMutationInitiatorType", i."initiatorType")
        AND i."inventoryItemId" = COALESCE(${(inventoryItemId as string | undefined) ?? null}, i."inventoryItemId")
        AND i."locationId" = ANY (${locationIds as string[]})
      ORDER BY CASE WHEN ${sortMode} = 'createdAt' AND ${sortOrder} = 'ascending' THEN i."createdAt" END ASC,
               CASE WHEN ${sortMode} = 'createdAt' AND ${sortOrder} = 'descending' THEN i."createdAt" END DESC,
               --
               CASE WHEN ${sortMode} = 'updatedAt' AND ${sortOrder} = 'ascending' THEN i."updatedAt" END ASC,
               CASE WHEN ${sortMode} = 'updatedAt' AND ${sortOrder} = 'descending' THEN i."updatedAt" END DESC,
               --
               CASE WHEN ${sortMode} = 'initiatorName' AND ${sortOrder} = 'ascending' THEN i."initiatorName" END ASC,
               CASE WHEN ${sortMode} = 'initiatorName' AND ${sortOrder} = 'descending' THEN i."initiatorName" END DESC,
               --
               CASE WHEN ${sortMode} = 'initiatorType' AND ${sortOrder} = 'ascending' THEN i."initiatorType" END ASC,
               CASE WHEN ${sortMode} = 'initiatorType' AND ${sortOrder} = 'descending' THEN i."initiatorType" END DESC,
               --
               CASE WHEN ${sortMode} = 'locationId' AND ${sortOrder} = 'ascending' THEN i."locationId" END ASC NULLS FIRST,
               CASE WHEN ${sortMode} = 'locationId' AND ${sortOrder} = 'descending' THEN i."locationId" END DESC NULLS LAST,
               --
               CASE WHEN ${sortMode} = 'staffMemberId' AND ${sortOrder} = 'ascending' THEN i."staffMemberId" END ASC NULLS FIRST,
               CASE WHEN ${sortMode} = 'staffMemberId' AND ${sortOrder} = 'descending' THEN i."staffMemberId" END DESC NULLS LAST,
               --
               CASE WHEN ${sortMode} = 'inventoryItemId' AND ${sortOrder} = 'ascending' THEN i."inventoryItemId" END ASC NULLS FIRST,
               CASE WHEN ${sortMode} = 'inventoryItemId' AND ${sortOrder} = 'descending' THEN i."inventoryItemId" END DESC NULLS LAST,
               --
               CASE WHEN ${sortMode} = 'available' AND i.name = 'available' AND ${sortOrder} = 'ascending' THEN COALESCE(i.quantity, i.delta) END ASC NULLS FIRST,
               CASE WHEN ${sortMode} = 'available' AND i.name = 'available' AND ${sortOrder} = 'descending' THEN COALESCE(i.quantity, i.delta) END DESC NULLS LAST,
               --
               CASE WHEN ${sortMode} = 'incoming' AND i.name = 'incoming' AND ${sortOrder} = 'ascending' THEN COALESCE(i.quantity, i.delta) END ASC NULLS FIRST,
               CASE WHEN ${sortMode} = 'incoming' AND i.name = 'incoming' AND ${sortOrder} = 'descending' THEN COALESCE(i.quantity, i.delta) END DESC NULLS LAST,
               --
               CASE WHEN ${sortMode} = 'reserved' AND i.name = 'reserved' AND ${sortOrder} = 'ascending' THEN COALESCE(i.quantity, i.delta) END ASC NULLS FIRST,
               CASE WHEN ${sortMode} = 'reserved' AND i.name = 'reserved' AND ${sortOrder} = 'descending' THEN COALESCE(i.quantity, i.delta) END DESC NULLS LAST,
               -- Tie breaker
               CASE WHEN ${sortOrder} = 'ascending' THEN i."updatedAt" END ASC,
               CASE WHEN ${sortOrder} = 'descending' THEN i."updatedAt" END DESC
      LIMIT ${limit + 1} OFFSET ${offset ?? null};
  `;

  return {
    items: items.slice(0, limit).map(({ inventoryItemId, locationId, staffMemberId, ...item }) => {
      try {
        assertGid(inventoryItemId);
        assertGid(locationId);
        assertGidOrNull(staffMemberId);

        return {
          ...item,
          inventoryItemId,
          locationId,
          staffMemberId,
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
