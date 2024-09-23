import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import type { FetchSettingsResponse } from '@web/controllers/api/settings.js';
import { Fetch } from './fetch.js';

export const useSettingsQuery = (
  { fetch }: { fetch: Fetch },
  options?: Partial<UseQueryOptions<FetchSettingsResponse, unknown, FetchSettingsResponse, string[]>>,
) => {
  return useQuery<FetchSettingsResponse, unknown, FetchSettingsResponse, string[]>({
    ...options,
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings');

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const { settings }: FetchSettingsResponse = await response.json();

      return { settings };
    },
  });
};
