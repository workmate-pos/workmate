import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { db } from '../db/db.js';
import { gql } from '../gql/gql.js';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { unit } from '../db/unit-of-work.js';

export async function ensureLocationsExist(session: Session, locationIds: ID[]) {
  if (locationIds.length === 0) {
    return;
  }

  const databaseLocations = await db.locations.getMany({ locationIds });
  const existingLocationIds = new Set(databaseLocations.map(location => location.locationId));
  const missingLocationIds = locationIds.filter(locationId => !existingLocationIds.has(locationId));

  await syncLocations(session, missingLocationIds);
}

export async function syncLocationsIfExists(session: Session, locationIds: ID[]) {
  if (locationIds.length === 0) {
    return;
  }

  const databaseLocations = await db.locations.getMany({ locationIds });
  const existingLocationIds = databaseLocations.map(location => {
    const locationId = location.locationId;
    assertGid(locationId);
    return locationId;
  });

  await syncLocations(session, existingLocationIds);
}

export async function syncLocations(session: Session, locationIds: ID[]) {
  if (locationIds.length === 0) {
    return;
  }

  const graphql = new Graphql(session);
  const { nodes } = await gql.location.getManyForDatabase.run(graphql, { ids: locationIds });
  const locations = nodes.filter(isNonNullable).filter(hasPropertyValue('__typename', 'Location'));

  const errors: unknown[] = [];

  await upsertLocations(session.shop, locations).catch(e => errors.push(e));

  if (locations.length !== locationIds.length) {
    errors.push(new Error(`Some locations were not found (${locations.length}/${locationIds.length})`));
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to sync locations');
  }
}

export async function upsertLocations(shop: string, locations: gql.location.DatabaseLocationFragment.Result[]) {
  if (locations.length === 0) {
    return;
  }

  await unit(async () => {
    await db.locations.upsertMany({
      locations: locations.map(location => ({
        locationId: location.id,
        name: location.name,
        shop,
      })),
    });
  });
}
