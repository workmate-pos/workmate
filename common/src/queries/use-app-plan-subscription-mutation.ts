import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import { Fetch } from './fetch.js';
import type { CreateAppPlanSubscriptionResponse } from '@web/controllers/api/app-plans.js';
import type { CreateAppPlanSubscription } from '@web/schemas/generated/create-app-plan-subscription.js';

export const useAppPlanSubscriptionMutation = (
  { fetch }: { fetch: Fetch },
  mutationOptions: UseMutationOptions<CreateAppPlanSubscriptionResponse, unknown, CreateAppPlanSubscription, unknown>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...mutationOptions,
    mutationKey: ['app-plan-subscription'],
    mutationFn: async (body: CreateAppPlanSubscription) => {
      const response = await fetch('/api/app-plans/subscription', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to mutate app plan');
      }

      const result: CreateAppPlanSubscriptionResponse = await response.json();
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['app-plan-subscription']);
    },
  });
};
