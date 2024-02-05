import { useQuery } from 'react-query';
import { Fetch } from './fetch.js';
import type { GetAppPlanSubscriptionResponse } from '@web/controllers/api/app-plans.js';

export const useAppPlanSubscriptionQuery = ({ fetch }: { fetch: Fetch }) =>
  useQuery({
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
