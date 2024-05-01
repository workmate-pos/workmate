import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import { Fetch } from './fetch.js';
import { PostCycleCount } from '@web/schemas/generated/post-cycle-count.js';
import { PostCycleCountResponse } from '@web/controllers/api/cycle-count.js';

export const useCycleCountMutation = (
  { fetch }: { fetch: Fetch },
  options?: UseMutationOptions<PostCycleCountResponse, unknown, PostCycleCount, unknown>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ['cycle-count'],
    mutationFn: async (body: PostCycleCount) => {
      const response = await fetch('/api/cycle-count', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to mutate cycle count');
      }

      const result: PostCycleCountResponse = await response.json();
      return result;
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries(['inventory-item']);
      queryClient.invalidateQueries(['inventory-items']);

      options?.onSuccess?.(...args);
    },
  });
};
