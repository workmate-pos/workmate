import { Fetch } from './fetch.js';
import type { ID } from '@web/services/gql/queries/generated/schema.js';
import type { FetchEmployeesByIdResponse } from '@web/controllers/api/employee.js';
import { useBatcher } from '../batcher/use-batcher.js';
import { useQueries, useQuery } from '@tanstack/react-query';

const useEmployeeBatcher = (fetch: Fetch) =>
  useBatcher({
    key: 'employees',
    maxSize: 25,
    handler: async (ids: ID[]) => {
      if (ids.length === 0) {
        return [];
      }

      const searchParams = new URLSearchParams();

      for (const id of ids) {
        searchParams.append('ids', id);
      }

      const response = await fetch(`/api/employee/by-ids?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }

      const results: FetchEmployeesByIdResponse = await response.json();
      return results.employees;
    },
  });

export const useEmployeeQuery = ({ fetch, id }: { fetch: Fetch; id: ID | null }) => {
  const batcher = useEmployeeBatcher(fetch);
  return useQuery({
    queryKey: ['employee', id],
    queryFn: () => {
      if (id === null) {
        return null;
      }

      return batcher.fetch(id);
    },
  });
};

export const useEmployeeQueries = ({ fetch, ids }: { fetch: Fetch; ids: ID[] }) => {
  const batcher = useEmployeeBatcher(fetch);
  const queries = useQueries({
    queries: ids.map(id => ({
      queryKey: ['employee', id],
      queryFn: () => batcher.fetch(id),
    })),
  });
  return Object.fromEntries(ids.map((id, i) => [id, queries[i]!]));
};
