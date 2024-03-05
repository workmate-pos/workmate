import { useQueries, useQuery } from 'react-query';
import type { ID } from '@web/services/gql/queries/generated/schema.js';
import { Fetch } from './fetch.js';
import { useBatcher } from '../batcher/use-batcher.js';
import { FetchInventoryItemsByIdResponse } from '@web/controllers/api/inventory-items.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { entries } from '@teifi-digital/shopify-app-toolbox/object';
import { withResolvers } from '@teifi-digital/shopify-app-toolbox/promise';

// TODO: Make batcher support grouping natively
const useInventoryItemBatcher = (fetch: Fetch) =>
  useBatcher({
    name: 'inventory-items',
    maxSize: 10,
    handler: async (ids: { inventoryItemId: ID; locationId: ID }[]) => {
      if (ids.length === 0) {
        return [];
      }

      const resolversByLocationIdByInventoryItemId: Record<
        ID,
        Record<ID, ReturnType<typeof withResolvers<InventoryItem>>>
      > = {};

      const result: Promise<InventoryItem>[] = [];

      for (const { inventoryItemId, locationId } of ids) {
        const resolversByInventoryItemId = (resolversByLocationIdByInventoryItemId[locationId] ??= {});
        const resolver = withResolvers<InventoryItem>();
        resolversByInventoryItemId[inventoryItemId] ??= resolver;
        result.push(resolver.promise);
      }

      for (const [locationId, resolversByInventoryItemId] of entries(resolversByLocationIdByInventoryItemId)) {
        const inventoryItemIds = Object.keys(resolversByInventoryItemId) as ID[];

        const searchParams = new URLSearchParams();

        searchParams.set('locationId', locationId);
        for (const id of inventoryItemIds) {
          searchParams.append('inventoryItemIds', id);
        }

        fetch(`/api/inventory-items/by-ids?${searchParams}`).then(async response => {
          if (!response.ok) {
            for (const { reject } of Object.values(resolversByInventoryItemId)) {
              reject(new Error('Failed to fetch inventory items'));
            }
            return;
          }

          const result: FetchInventoryItemsByIdResponse = await response.json();

          for (let i = 0; i < inventoryItemIds.length; i++) {
            const inventoryItemId = inventoryItemIds[i] ?? never();
            const { resolve } = resolversByInventoryItemId[inventoryItemId] ?? never();
            const inventoryItem = result.inventoryItems[i] ?? null;
            resolve(inventoryItem);
          }
        });
      }

      return await Promise.all(result);
    },
  });

export const useInventoryItemQuery = ({
  fetch,
  id,
  locationId,
}: {
  fetch: Fetch;
  id: ID | null;
  locationId: ID | null;
}) => {
  const batcher = useInventoryItemBatcher(fetch);
  return useQuery({
    queryKey: ['inventory-item', locationId, id] as const,
    queryFn: () => {
      if (id === null) {
        return null;
      }

      if (locationId === null) {
        return null;
      }

      return batcher.fetch({ inventoryItemId: id, locationId });
    },
  });
};

export const useInventoryItemQueries = ({ fetch, ids, locationId }: { fetch: Fetch; ids: ID[]; locationId: ID }) => {
  const batcher = useInventoryItemBatcher(fetch);
  const queries = useQueries(
    ids.map(id => ({
      queryKey: ['inventory-item', locationId, id],
      queryFn: () => batcher.fetch({ inventoryItemId: id, locationId }),
    })),
  );
  return Object.fromEntries(ids.map((id, i) => [id, queries[i]!]));
};

export type InventoryItem = FetchInventoryItemsByIdResponse['inventoryItems'][number];
