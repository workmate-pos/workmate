import { UseQueryOptions, useQuery } from '@tanstack/react-query';
import { Fetch } from './fetch.js';
import type { GetAppPlanSubscriptionResponse } from '@web/controllers/api/app-plans.js';

export const useAppPlanSubscriptionQuery = (
  { fetch }: { fetch: Fetch },
  options?: UseQueryOptions<AppPlanSubscription | null, unknown, AppPlanSubscription | null, string[]>,
) =>
  useQuery({
    ...options,
    queryKey: ['app-plan-subscription'],
    queryFn: async () => {
      const response = await fetch('/api/app-plans/subscription');

      if (!response.ok) {
        throw new Error('Failed to fetch app plan');
      }

      const { appPlanSubscription }: GetAppPlanSubscriptionResponse = await response.json();
      return appPlanSubscription;
    },
  });

type AppPlanSubscription = NonNullable<GetAppPlanSubscriptionResponse['appPlanSubscription']>;
