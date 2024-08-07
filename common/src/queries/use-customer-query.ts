import { useQueries, useQuery } from 'react-query';
import type { ID } from '@web/services/gql/queries/generated/schema.js';
import type { FetchCustomersByIdResponse } from '@web/controllers/api/customer.js';
import { Fetch } from './fetch.js';
import { useBatcher } from '../batcher/use-batcher.js';

const useCustomerBatcher = (fetch: Fetch) =>
  useBatcher({
    key: 'customers',
    maxSize: 10,
    handler: async (ids: ID[]) => {
      if (ids.length === 0) {
        return [];
      }

      const searchParams = new URLSearchParams();

      for (const id of ids) {
        searchParams.append('ids', id);
      }

      const response = await fetch(`/api/customer/by-ids?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }

      const results: FetchCustomersByIdResponse = await response.json();
      return results.customers;
    },
  });

export const useCustomerQuery = ({ fetch, id }: { fetch: Fetch; id: ID | null }) => {
  const batcher = useCustomerBatcher(fetch);
  return useQuery({
    queryKey: ['customer', id] as const,
    queryFn: () => {
      if (id === null) {
        return null;
      }

      return batcher.fetch(id);
    },
  });
};

export const useCustomerQueries = ({ fetch, ids }: { fetch: Fetch; ids: ID[] }) => {
  const batcher = useCustomerBatcher(fetch);
  const queries = useQueries(
    ids.map(id => ({
      queryKey: ['customer', id],
      queryFn: () => batcher.fetch(id),
    })),
  );
  return Object.fromEntries(ids.map((id, i) => [id, queries[i]!]));
};
