import { Session } from '@shopify/shopify-api';
import { CacheMap } from '../../util/CacheMap.js';
import { MINUTE_IN_MS } from '@work-orders/common/time/constants.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { fetchAllPages, gql } from '../gql/gql.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { LocalsTeifiUser } from '../../decorators/permission.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

// TODO: Eventually store in db/redis cache + setup for pruning (namespace cache, del cache:*)
const shopLocations = new CacheMap<string, gql.location.LocationFragment.Result[]>(10 * MINUTE_IN_MS);

const isLocationAllowed = (allowedLocationIds: ID[] | null) => (location: gql.location.LocationFragment.Result) =>
  allowedLocationIds === null || allowedLocationIds.includes(location.id);

export async function getLocations(session: Session, allowedLocationIds: ID[] | null) {
  if (shopLocations.has(session.shop)) {
    return shopLocations.get(session.shop)?.filter(isLocationAllowed(allowedLocationIds)) ?? never();
  }

  const locations = await fetchAllPages(
    new Graphql(session),
    (graphql, variables) => gql.location.getPage.run(graphql, variables),
    result => result.locations,
  );

  shopLocations.set(session.shop, locations);

  return locations.filter(isLocationAllowed(allowedLocationIds));
}
