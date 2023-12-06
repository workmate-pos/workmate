import { useQuery } from 'react-query';
import { useAuthenticatedFetch } from '@teifi-digital/shopify-app-react';
import type { FetchStorePropertiesResponse } from '../../controllers/api/store-properties';

export const useStorePropertiesQuery = () => {
  const fetch = useAuthenticatedFetch();
  return useQuery(
    ['store-properties'],
    (): Promise<FetchStorePropertiesResponse> => fetch(`/api/store-properties`).then(res => res.json()),
  );
};
