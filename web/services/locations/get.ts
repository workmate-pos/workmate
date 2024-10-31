import { Session } from '@shopify/shopify-api';
import { CacheMap } from '../../util/CacheMap.js';
import { MINUTE_IN_MS } from '@work-orders/common/time/constants.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { fetchAllPages, gql } from '../gql/gql.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services';

const shopLocations = new CacheMap<string, gql.location.LocationFragment.Result[]>(10 * MINUTE_IN_MS);

export async function getLocations(session: Session) {
  if (shopLocations.has(session.shop)) {
    return shopLocations.get(session.shop) ?? never();
  }

  const locations = await fetchAllPages(
    new Graphql(session),
    (graphql, variables) => gql.location.getPage.run(graphql, variables),
    result => result.locations,
  );

  shopLocations.set(session.shop, locations);

  return locations;
}
