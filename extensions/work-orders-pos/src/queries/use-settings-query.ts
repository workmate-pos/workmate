import { useQuery, UseQueryOptions } from 'react-query';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import type { FetchSettingsResponse } from '@web/controllers/api/settings';

export const useSettingsQuery = (
  options?: UseQueryOptions<FetchSettingsResponse, unknown, FetchSettingsResponse, string[]>,
) => {
  const fetch = useAuthenticatedFetch();
  return useQuery({
    ...options,
    queryKey: ['settings'],
    queryFn: async (): Promise<FetchSettingsResponse> => {
      const response = await fetch('/api/settings');

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      return await response.json();
    },
  });
};
