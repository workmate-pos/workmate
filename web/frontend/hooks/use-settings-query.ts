import { useQuery, UseQueryOptions } from 'react-query';
import type { ShopSettings } from '../../schemas/generated/shop-settings';
import { useAuthenticatedFetch } from '@teifi-digital/shopify-app-react';

export const useSettingsQuery = (options: UseQueryOptions<SettingsQueryData>) => {
  const fetch = useAuthenticatedFetch();
  return useQuery(['settings'], () => fetch('/api/settings').then<SettingsQueryData>(res => res.json()), options);
};

type SettingsQueryData = { settings: ShopSettings };
