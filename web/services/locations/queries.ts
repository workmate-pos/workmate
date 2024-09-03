import { sqlOne } from '../db/sql-tag.js';
import { assertGid } from '@teifi-digital/shopify-app-toolbox/shopify';

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
