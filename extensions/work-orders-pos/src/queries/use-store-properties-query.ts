import { useQuery, UseQueryOptions } from 'react-query';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';

export const useStorePropertiesQuery = (options?: UseQueryOptions<StorePropertiesQueryResponse>) => {
  const fetch = useAuthenticatedFetch();
  return useQuery<StorePropertiesQueryResponse>(
    ['store-properties'],
    () => fetch('/api/store-properties').then(res => res.json()),
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
