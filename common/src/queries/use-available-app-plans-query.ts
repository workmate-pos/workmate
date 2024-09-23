import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { Fetch } from './fetch.js';
import type { GetAvailableAppPlansResponse } from '@web/controllers/api/app-plans.js';

export const useAvailableAppPlansQuery = (
  { fetch }: { fetch: Fetch },
  options?: Partial<UseQueryOptions<GetAvailableAppPlansResponse, unknown, GetAvailableAppPlansResponse, string[]>>,
) =>
  useQuery({
    ...options,
    queryKey: ['available-app-plans'],
    queryFn: async () => {
      const response = await fetch('/api/app-plans');

      if (!response.ok) {
        throw new Error('Failed to fetch available app plans');
      }

      const res: GetAvailableAppPlansResponse = await response.json();
      return res;
    },
  });
