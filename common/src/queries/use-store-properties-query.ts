import { useQuery, UseQueryOptions } from 'react-query';
import type { FetchStorePropertiesResponse } from '@web/controllers/api/store-properties.js';
import { Fetch } from './fetch.js';

export const useStorePropertiesQuery = (
  { fetch }: { fetch: Fetch },
  options?: UseQueryOptions<FetchStorePropertiesResponse, unknown, FetchStorePropertiesResponse, string[]>,
) => {
  return useQuery({
    ...options,
    queryKey: ['store-properties'],
    queryFn: async (): Promise<FetchStorePropertiesResponse> => {
      const response = await fetch('/api/store-properties');

      if (!response.ok) {
        throw new Error('Failed to fetch store properties');
      }

      return await response.json();
    },
  });
};
