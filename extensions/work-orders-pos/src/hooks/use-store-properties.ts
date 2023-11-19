import { createContext, useContext } from 'react';

export const storePropertiesContext = createContext<StoreProperties | null>(null);

export const useStoreProperties = (): StoreProperties | null => {
  return useContext(storePropertiesContext);
};

export type StoreProperties = {
  name: string;
  currencyCode: string;
  currencyFormat: string;
};
