import { isNonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';
import { nest } from '../../util/db.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { escapeLike } from '../db/like.js';
import { sql, sqlOne } from '../db/sql-tag.js';

export type InventoryMutationType = 'MOVE' | 'SET' | 'ADJUST';
export type InventoryMutationInitiatorType = 'PURCHASE_ORDER' | 'STOCK_TRANSFER' | 'CYCLE_COUNT';

export async function insertInventoryMutation({
  shop,
  type,
  initiator,
}: {
  shop: string;
  type: InventoryMutationType;
  initiator: {
    type: InventoryMutationInitiatorType;
    name: string;
  };
}) {
  return await sqlOne<{ id: number }>`
    INSERT INTO "InventoryMutation" (shop, type, "initiatorType", "initiatorName")
    VALUES (${shop},
            ${type} :: "InventoryMutationType",
            ${initiator.type} :: "InventoryMutationInitiatorType",
            ${initiator.name})
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
    locationId,
    sortOrder = 'descending',
    sortMode = 'createdAt',
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
    locationId?: ID;
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
    initiatorType: 'PURCHASE_ORDER' | 'STOCK_TRANSFER' | 'CYCLE_COUNT';
    initiatorName: string;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT m.*
    FROM "InventoryMutation" m
    WHERE m.shop = ${shop}
      AND m.type = COALESCE(${type ?? null} :: "InventoryMutationType", m.type)
      AND m."initiatorName" ILIKE ${query ? `%${escapeLike(query)}%` : '%'}
      AND m."initiatorType" =
          COALESCE(${initiator?.type ?? null} :: "InventoryMutationInitiatorType", m."initiatorType")
      AND (${(inventoryItemId as string | undefined) ?? null} :: text IS NULL OR
           EXISTS (SELECT 1
                   FROM "InventoryMutationItem" i
                   WHERE i."inventoryMutationId" = m.id
                     AND i."inventoryItemId" = ${(inventoryItemId as string | undefined) ?? null}))
      AND (${(locationId as string | undefined) ?? null} :: text IS NULL OR
           EXISTS (SELECT 1
                   FROM "InventoryMutationItem" i
                   WHERE i."inventoryMutationId" = m.id
                     AND i."locationId" = ${(locationId as string | undefined) ?? null}))
    ORDER BY CASE WHEN ${sortMode} = 'createdAt' AND ${sortOrder} = 'ascending' THEN m."createdAt" END ASC NULLS LAST,
             CASE WHEN ${sortMode} = 'createdAt' AND ${sortOrder} = 'descending' THEN m."createdAt" END DESC NULLS LAST,
             --
             CASE WHEN ${sortMode} = 'updatedAt' AND ${sortOrder} = 'ascending' THEN m."updatedAt" END ASC NULLS LAST,
             CASE WHEN ${sortMode} = 'updatedAt' AND ${sortOrder} = 'descending' THEN m."updatedAt" END DESC NULLS LAST,
             --
             CASE WHEN ${sortMode} = 'initiatorName' AND ${sortOrder} = 'ascending' THEN m."initiatorName" END ASC NULLS LAST,
             CASE WHEN ${sortMode} = 'initiatorName' AND ${sortOrder} = 'descending' THEN m."initiatorName" END DESC NULLS LAST,
             --
             CASE WHEN ${sortMode} = 'initiatorType' AND ${sortOrder} = 'ascending' THEN m."initiatorType" END ASC NULLS LAST,
             CASE WHEN ${sortMode} = 'initiatorType' AND ${sortOrder} = 'descending' THEN m."initiatorType" END DESC NULLS LAST
    LIMIT ${limit + 1} OFFSET ${offset ?? null}
  `;

  return {
    mutations: mutations.slice(0, limit),
    hasNextPage: mutations.length > limit,
  };
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
