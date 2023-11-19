import { storePropertiesContext } from '../hooks/use-store-properties';
import { useQuery } from 'react-query';
import { ReactNode, useState } from 'react';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import type { StoreProperties } from '../hooks/use-store-properties';

export function StorePropertiesProvider({ children }: { children: ReactNode }) {
  const [storeProperties, setStoreProperties] = useState<StoreProperties | null>(null);

  const fetch = useAuthenticatedFetch();

  useQuery(
    ['store-properties'],
    (): Promise<{ storeProperties: StoreProperties }> => fetch(`/api/store-properties`).then(res => res.json()),
    {
      onSuccess({ storeProperties }) {
        setStoreProperties(storeProperties);
      },
    },
  );

  return <storePropertiesContext.Provider value={storeProperties}>{children}</storePropertiesContext.Provider>;
}
