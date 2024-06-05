import { useQueries, useQuery } from 'react-query';
import type { ID } from '@web/services/gql/queries/generated/schema.js';
import { Fetch } from './fetch.js';
import { useBatcher } from '../batcher/use-batcher.js';
import { FetchLocationsByIdResponse } from '@web/controllers/api/locations.js';

const useLocationBatcher = (fetch: Fetch) =>
  useBatcher({
    name: 'locations',
    maxSize: 10,
    handler: async (ids: ID[]) => {
      if (ids.length === 0) {
        return [];
      }

      const searchParams = new URLSearchParams();

      for (const id of ids) {
        searchParams.append('ids', id);
      }

      const response = await fetch(`/api/locations/by-ids?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }

      const results: FetchLocationsByIdResponse = await response.json();
      return results.locations;
    },
  });

export const useLocationQuery = ({ fetch, id }: { fetch: Fetch; id: ID | null }, options?: { enabled?: boolean }) => {
  const batcher = useLocationBatcher(fetch);
  return useQuery({
    ...options,
    queryKey: ['location', id] as const,
    queryFn: () => {
      if (id === null) {
        return null;
      }

      return batcher.fetch(id);
    },
  });
};

export const useLocationQueries = ({ fetch, ids }: { fetch: Fetch; ids: ID[] }) => {
  const batcher = useLocationBatcher(fetch);
  const queries = useQueries(
    ids.map(id => ({
      queryKey: ['location', id],
      queryFn: () => batcher.fetch(id),
    })),
  );
  return Object.fromEntries(ids.map((id, i) => [id, queries[i]!]));
};
