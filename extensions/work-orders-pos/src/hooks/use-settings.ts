import { createContext, useContext } from 'react';
import { ShopSettings } from '../schemas/generated/shop-settings';

export const settingsContext = createContext<ShopSettings | null>(null);

export const useSettings = (): ShopSettings | null => {
  return useContext(settingsContext);
};
