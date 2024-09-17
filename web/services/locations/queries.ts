import { sql, sqlOne } from '../db/sql-tag.js';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { MergeUnion } from '../../util/types.js';

export async function getLocationForSpecialOrder(specialOrderId: number) {
  const location = await sqlOne<{
    locationId: string;
    shop: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }>`
    SELECT l.*
    FROM "Location" l
           INNER JOIN "SpecialOrder" so ON so."locationId" = l."locationId"
    WHERE so."id" = ${specialOrderId}
    LIMIT 1;
  `;

  return mapLocation(location);
}

function mapLocation(location: {
  locationId: string;
  shop: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) {
  const { locationId } = location;

  try {
    assertGid(locationId);

    return {
      ...location,
      locationId,
    };
  } catch (error) {
    throw new Error('Unable to parse location');
  }
}

export async function getLocationForSerial({
  shop,
  serial,
  id,
  productVariantId,
}: MergeUnion<
  | { id: number }
  | {
      shop: string;
      serial: string;
      productVariantId: ID;
    }
>) {
  const _productVariantId: string | null = productVariantId ?? null;

  const [location] = await sql<{
    locationId: string;
    shop: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }>`
    SELECT l.*
    FROM "ProductVariantSerial" pvs
           INNER JOIN "Location" l USING ("locationId")
    WHERE pvs.id = COALESCE(${id ?? null}, pvs.id)
      AND pvs."productVariantId" = COALESCE(${_productVariantId}, pvs."productVariantId")
      AND pvs.serial = COALESCE(${serial ?? null}, pvs.serial)
      AND pvs.shop = COALESCE(${shop ?? null}, pvs.shop);
  `;

  if (!location) {
    return null;
  }

  return mapLocation(location);
}

export async function getLocations(locationIds: ID[]) {
  const locations = await sql<{
    locationId: string;
    shop: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }>`
    SELECT *
    FROM "Location"
    WHERE "locationId" = ANY (${locationIds as string[]} :: text[]);
  `;

  return locations.map(mapLocation);
}
