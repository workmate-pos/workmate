import { ShopSettings } from '../../../../web/schemas/generated/shop-settings';
import { useQuery, UseQueryOptions } from 'react-query';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';

export const useSettingsQuery = (options?: UseQueryOptions<SettingsQueryResponse>) => {
  const fetch = useAuthenticatedFetch();
  return useQuery<SettingsQueryResponse>(['settings'], () => fetch('/api/settings').then(res => res.json()), options);
};

type SettingsQueryResponse = { settings: ShopSettings };
