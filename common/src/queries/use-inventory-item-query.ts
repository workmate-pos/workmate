import { useQueries, useQuery } from 'react-query';
import type { ID } from '@web/services/gql/queries/generated/schema.js';
import { Fetch } from './fetch.js';
import { useBatcher } from '../batcher/use-batcher.js';
import { FetchInventoryItemResponse, FetchInventoryItemsByIdResponse } from '@web/controllers/api/inventory-items.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { withResolvers } from '@teifi-digital/shopify-app-toolbox/promise';

// TODO: Make batcher support grouping natively
const useInventoryItemBatcher = (fetch: Fetch) =>
  useBatcher({
    key: 'inventory-items',
    maxSize: 25,
    handler: async (ids: { inventoryItemId: ID; locationId: ID | null }[]) => {
      if (ids.length === 0) {
        return [];
      }

      const resolversByLocationIdByInventoryItemId = new Map<
        ID | null,
        Record<ID, ReturnType<typeof withResolvers<InventoryItem>>>
      >();

      const result: Promise<InventoryItem>[] = [];

      for (const { inventoryItemId, locationId } of ids) {
        const resolversByInventoryItemId = resolversByLocationIdByInventoryItemId.get(locationId) ?? {};
        resolversByLocationIdByInventoryItemId.set(locationId, resolversByInventoryItemId);

        const resolver = withResolvers<InventoryItem>();
        resolversByInventoryItemId[inventoryItemId] ??= resolver;
        result.push(resolver.promise);
      }

      for (const [locationId, resolversByInventoryItemId] of resolversByLocationIdByInventoryItemId.entries()) {
        const inventoryItemIds = Object.keys(resolversByInventoryItemId) as ID[];

        const searchParams = new URLSearchParams();

        if (locationId) {
          searchParams.set('locationId', locationId);
        }

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
    queryKey: ['inventory-item', id, locationId] as const,
    queryFn: () => {
      if (id === null) {
        return null;
      }

      return batcher.fetch({ inventoryItemId: id, locationId });
    },
  });
};

export const useInventoryItemQueries = (
  {
    fetch,
    ids,
    locationId,
  }: {
    fetch: Fetch;
    ids: ID[];
    locationId: ID | null;
  },
  options?: { enabled?: boolean },
) => {
  const batcher = useInventoryItemBatcher(fetch);
  const queries = useQueries(
    ids.map(id => ({
      ...options,
      queryKey: ['inventory-item', id, locationId],
      queryFn: () => batcher.fetch({ inventoryItemId: id, locationId }),
    })),
  );
  return Object.fromEntries(ids.map((id, i) => [id, queries[i]!]));
};

/**
 * `useInventoryItemQueries` without batching. The advantage is the ability to use many different locations.
 */
export const useUnbatchedInventoryItemQueries = ({
  fetch,
  inventoryItems,
}: {
  fetch: Fetch;
  inventoryItems: { id: ID; locationId: ID }[];
}) => {
  const queries = useQueries(
    inventoryItems.map(({ id, locationId }) => ({
      queryKey: ['inventory-item', id, locationId],
      queryFn: async () => {
        const response = await fetch(
          `/api/inventory-items/${encodeURIComponent(locationId)}/${encodeURIComponent(id)}/`,
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch inventory item (${response.status})`);
        }

        const { inventoryItem }: FetchInventoryItemResponse = await response.json();
        return inventoryItem;
      },
    })),
  );

  const inventoryItemQueriesByIdByLocation: Record<ID, Record<ID, (typeof queries)[number]>> = {};

  for (const [i, { id, locationId }] of inventoryItems.entries()) {
    const inventoryItemQueriesByLocation = (inventoryItemQueriesByIdByLocation[id] ??= {});
    inventoryItemQueriesByLocation[locationId ?? 'null'] = queries[i]!;
  }

  return inventoryItemQueriesByIdByLocation;
};

export type InventoryItem = FetchInventoryItemsByIdResponse['inventoryItems'][number];
