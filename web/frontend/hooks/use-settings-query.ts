import { useQuery, UseQueryOptions } from 'react-query';
import { useAuthenticatedFetch } from '@teifi-digital/shopify-app-react';
import type { FetchSettingsResponse } from '../../controllers/api/settings';

export const useSettingsQuery = (options: UseQueryOptions<FetchSettingsResponse>) => {
  const fetch = useAuthenticatedFetch();
  return useQuery({
    ...options,
    queryKey: ['settings'],
    queryFn: (): Promise<FetchSettingsResponse> => fetch('/api/settings').then(res => res.json()),
  });
};
