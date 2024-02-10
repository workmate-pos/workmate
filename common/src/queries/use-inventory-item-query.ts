import { useQueries, useQuery } from 'react-query';
import type { ID } from '@web/services/gql/queries/generated/schema.js';
import { Fetch } from './fetch.js';
import { useBatcher } from '../batcher/use-batcher.js';
import { FetchInventoryItemsByIdResponse } from '@web/controllers/api/inventory-items.js';

const useInventoryItemBatcher = (fetch: Fetch) =>
  useBatcher({
    name: 'inventory-items',
    maxSize: 10,
    handler: async (ids: ID[]) => {
      if (ids.length === 0) {
        return [];
      }

      const searchParams = new URLSearchParams();

      for (const id of ids) {
        searchParams.append('ids', id);
      }

      const response = await fetch(`/api/inventory-items/by-ids?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch inventory items');
      }

      const results: FetchInventoryItemsByIdResponse = await response.json();
      return results.inventoryItems;
    },
  });

export const useInventoryItemQuery = ({ fetch, id }: { fetch: Fetch; id: ID | null }) => {
  const batcher = useInventoryItemBatcher(fetch);
  return useQuery({
    queryKey: ['inventory-item', id] as const,
    queryFn: () => {
      if (id === null) {
        return null;
      }

      return batcher.fetch(id);
    },
  });
};

export const useInventoryItemQueries = ({ fetch, ids }: { fetch: Fetch; ids: ID[] }) => {
  const batcher = useInventoryItemBatcher(fetch);
  const queries = useQueries(
    ids.map(id => ({
      queryKey: ['inventory-item', id],
      queryFn: () => batcher.fetch(id),
    })),
  );
  return Object.fromEntries(ids.map((id, i) => [id, queries[i]!]));
};
