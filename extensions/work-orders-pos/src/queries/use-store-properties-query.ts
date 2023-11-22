import { useQuery, UseQueryOptions } from 'react-query';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';

export const useStorePropertiesQuery = (options?: UseQueryOptions<StorePropertiesQueryResponse>) => {
  const fetch = useAuthenticatedFetch();
  return useQuery<StorePropertiesQueryResponse>(
    ['store-properties'],
    async () => {
      const response = await fetch('/api/store-properties');

      if (!response.ok) {
        throw new Error('Failed to fetch store properties');
      }

      return await response.json();
    },
    options,
  );
};

export type StoreProperties = {
  name: string;
  currencyCode: string;
  currencyFormat: string;
};

type StorePropertiesQueryResponse = {
  storeProperties: StoreProperties;
};
