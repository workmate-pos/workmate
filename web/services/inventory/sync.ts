import { Session } from '@shopify/shopify-api';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { gql } from '../gql/gql.js';
import { getLocations } from '../locations/get.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { upsertInventoryQuantities } from './queries.js';
import { hasNestedPropertyValue, hasNonNullableProperty } from '@teifi-digital/shopify-app-toolbox/guards';

export async function syncInventoryQuantities(session: Session, inventoryItemIds: ID[]) {
  const locations = await getLocations(session, null);

  const graphql = new Graphql(session);

  const locationInventoryItems = await Promise.all(
    locations.map(location =>
      gql.inventoryItems.getManyWithLocationInventoryLevel.run(graphql, {
        ids: inventoryItemIds,
        locationId: location.id,
      }),
    ),
  );

  const quantities = locationInventoryItems
    .flatMap(result => result.nodes)
    .filter(hasNestedPropertyValue('__typename', 'InventoryItem'))
    .filter(hasNonNullableProperty('inventoryLevel'))
    .flatMap(inventoryItem =>
      inventoryItem.inventoryLevel.quantities.map(({ name, quantity }) => ({
        inventoryItemId: inventoryItem.id,
        locationId: inventoryItem.inventoryLevel.location.id,
        name,
        quantity,
      })),
    );

  await upsertInventoryQuantities(session.shop, quantities);
}
