import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { sql } from '../db/sql-tag.js';
import { MergeUnion } from '../../util/types.js';

export async function createOrIncrementShopifyOrderLineItemReservation(
  lineItemId: ID,
  locationId: ID,
  quantity: number,
) {
  const _lineItemId: string = lineItemId;
  const _locationId: string = locationId;

  await sql`
    INSERT INTO "ShopifyOrderLineItemReservation" ("lineItemId", "locationId", quantity)
    VALUES (${_lineItemId}, ${_locationId}, ${quantity})
    ON CONFLICT ("lineItemId")
      DO UPDATE SET quantity = "ShopifyOrderLineItemReservation".quantity + EXCLUDED.quantity;`;
}

export async function getShopifyOrderLineItemReservations({
  lineItemId,
  locationId,
}: MergeUnion<{ lineItemId: ID } | { locationId: ID }>) {
  const _lineItemId: string | null = lineItemId ?? null;
  const _locationId: string | null = locationId ?? null;

  const reservations = await sql<{ lineItemId: string; locationId: string; quantity: number }>`
    SELECT *
    FROM "ShopifyOrderLineItemReservation"
    WHERE "lineItemId" = COALESCE(${_lineItemId}, "lineItemId")
      AND "locationId" = COALESCE(${_locationId}, "locationId");`;

  return reservations.map(mapReservation);
}

export async function getShopifyOrderLineItemReservationsByIds(lineItemIds: ID[]) {
  const _lineItemIds: string[] = lineItemIds;

  const reservations = await sql<{
    lineItemId: string;
    locationId: string;
    quantity: number;
  }>`
    SELECT *
    FROM "ShopifyOrderLineItemReservation"
    WHERE "lineItemId" = ANY (${_lineItemIds});`;

  return reservations.map(mapReservation);
}

function mapReservation(reservation: { lineItemId: string; locationId: string; quantity: number }) {
  const { lineItemId, locationId } = reservation;

  assertGid(lineItemId);
  assertGid(locationId);

  return {
    ...reservation,
    lineItemId,
    locationId,
  };
}

export async function removeShopifyOrderLineItemReservation({
  lineItemId,
  locationId,
}: MergeUnion<{ locationId: ID } | { lineItemId: ID }>) {
  const _lineItemId: string | null = lineItemId ?? null;
  const _locationId: string | null = locationId ?? null;

  await sql`
    DELETE
    FROM "ShopifyOrderLineItemReservation"
    WHERE "locationId" = COALESCE(${_locationId}, "locationId")
      AND "lineItemId" = COALESCE(${_lineItemId}, "lineItemId");`;
}
