import { useQuery, UseQueryOptions } from 'react-query';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import type { FetchStorePropertiesResponse } from '@web/controllers/api/store-properties';

export const useStorePropertiesQuery = (
  options?: UseQueryOptions<FetchStorePropertiesResponse, unknown, FetchStorePropertiesResponse, string[]>,
) => {
  const fetch = useAuthenticatedFetch();
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
