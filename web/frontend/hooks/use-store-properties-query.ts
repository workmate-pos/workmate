import { useQuery } from 'react-query';
import { useAuthenticatedFetch } from '@teifi-digital/shopify-app-react';

export const useStorePropertiesQuery = () => {
  const fetch = useAuthenticatedFetch();
  return useQuery(
    ['store-properties'],
    (): Promise<{ storeProperties: StoreProperties }> => fetch(`/api/store-properties`).then(res => res.json()),
  );
};

export type StoreProperties = {
  name: string;
  currencyCode: string;
  currencyFormat: string;
};
