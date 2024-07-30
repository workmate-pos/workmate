import { useQueries, useQuery } from 'react-query';
import type { ID } from '@web/services/gql/queries/generated/schema.js';
import type { FetchCompaniesByIdResponse } from '@web/controllers/api/companies.js';
import { Fetch } from './fetch.js';
import { useBatcher } from '../batcher/use-batcher.js';

const useCompanyBatcher = (fetch: Fetch) =>
  useBatcher({
    key: 'companies',
    maxSize: 10,
    handler: async (ids: ID[]) => {
      if (ids.length === 0) {
        return [];
      }

      const searchParams = new URLSearchParams();

      for (const id of ids) {
        searchParams.append('ids', id);
      }

      const response = await fetch(`/api/companies/by-ids?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }

      const results: FetchCompaniesByIdResponse = await response.json();
      return results.companies;
    },
  });

export const useCompanyQuery = ({ fetch, id }: { fetch: Fetch; id: ID | null }, options?: { enabled?: boolean }) => {
  const batcher = useCompanyBatcher(fetch);
  return useQuery({
    ...options,
    queryKey: ['company', id] as const,
    queryFn: () => {
      if (id === null) {
        return null;
      }

      return batcher.fetch(id);
    },
  });
};

export const useCompanyQueries = ({ fetch, ids }: { fetch: Fetch; ids: ID[] }) => {
  const batcher = useCompanyBatcher(fetch);
  const queries = useQueries(
    ids.map(id => ({
      queryKey: ['company', id],
      queryFn: () => batcher.fetch(id),
    })),
  );
  return Object.fromEntries(ids.map((id, i) => [id, queries[i]!]));
};
