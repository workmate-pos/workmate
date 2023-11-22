import { ShopSettings } from '../../../../web/schemas/generated/shop-settings';
import { useQuery, UseQueryOptions } from 'react-query';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';

export const useSettingsQuery = (options?: UseQueryOptions<SettingsQueryResponse>) => {
  const fetch = useAuthenticatedFetch();
  return useQuery<SettingsQueryResponse>(
    ['settings'],
    async () => {
      const response = await fetch('/api/settings');

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      return await response.json();
    },
    options,
  );
};

type SettingsQueryResponse = { settings: ShopSettings };
