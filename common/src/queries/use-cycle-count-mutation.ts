import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import { Fetch } from './fetch.js';
import { CreateCycleCount } from '@web/schemas/generated/create-cycle-count.js';
import { CreateCycleCountResponse } from '@web/controllers/api/cycle-count.js';
import { UseQueryData } from './react-query.js';
import { useCycleCountQuery } from './use-cycle-count-query.js';

export const useCycleCountMutation = (
  { fetch }: { fetch: Fetch },
  options?: UseMutationOptions<CreateCycleCountResponse, unknown, CreateCycleCount, unknown>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async (body: CreateCycleCount) => {
      const response = await fetch('/api/cycle-count', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to mutate cycle count');
      }

      const result: CreateCycleCountResponse = await response.json();
      return result;
    },
    onSuccess: result => {
      queryClient.invalidateQueries(['inventory-item']);
      queryClient.invalidateQueries(['inventory-items']);
      queryClient.invalidateQueries(['cycle-count-page']);
      queryClient.setQueryData(['cycle-count', result.name], result satisfies UseQueryData<typeof useCycleCountQuery>);
    },
  });
};
