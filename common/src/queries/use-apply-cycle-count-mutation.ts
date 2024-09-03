import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import { Fetch } from './fetch.js';
import { ApplyCycleCountResponse } from '@web/controllers/api/cycle-count.js';
import { UseQueryData } from './react-query.js';
import { useCycleCountQuery } from './use-cycle-count-query.js';
import { useCycleCountPageQuery } from './use-cycle-count-page-query.js';
import { ApplyCycleCountPlan } from '@web/services/cycle-count/apply.js';
import { ApplyCycleCount } from '@web/schemas/generated/apply-cycle-count.js';

export const useApplyCycleCountMutation = (
  { fetch }: { fetch: Fetch },
  options?: UseMutationOptions<ApplyCycleCountResponse, unknown, ApplyCycleCountPlan, unknown>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async (plan: ApplyCycleCountPlan) => {
      const response = await fetch(`/api/cycle-count/${encodeURIComponent(plan.cycleCountName)}/apply`, {
        method: 'POST',
        body: JSON.stringify({ items: plan.itemApplications } satisfies ApplyCycleCount),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to apply cycle count');
      }

      const result: ApplyCycleCountResponse = await response.json();
      return result;
    },
    onSuccess(...args) {
      queryClient.invalidateQueries(['inventory-item']);
      queryClient.invalidateQueries(['inventory-items']);
      queryClient.invalidateQueries(['cycle-count-page']);

      const [result] = args;
      queryClient.setQueryData(['cycle-count', result.name], result satisfies UseQueryData<typeof useCycleCountQuery>);

      for (const [queryKey, data] of queryClient.getQueriesData<UseQueryData<typeof useCycleCountPageQuery>>([
        'cycle-count-page',
      ])) {
        queryClient.setQueryData(queryKey, {
          ...data,
          pages: data.pages.map(page =>
            page.map(cycleCount => {
              if (cycleCount.name === result.name) {
                return result;
              }

              return cycleCount;
            }),
          ),
        });
      }

      options?.onSuccess?.(...args);
    },
  });
};
