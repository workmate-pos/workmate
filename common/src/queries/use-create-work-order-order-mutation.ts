import { Fetch } from './fetch.js';
import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import { CreateWorkOrderOrderResponse } from '@web/controllers/api/work-order.js';
import { CreateWorkOrderOrder } from '@web/schemas/generated/create-work-order-order.js';

export const useCreateWorkOrderOrderMutation = (
  { fetch }: { fetch: Fetch },
  options?: UseMutationOptions<CreateWorkOrderOrderResponse, unknown, CreateWorkOrderOrder, unknown>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ['create-work-order-order'],
    mutationFn: async (createWorkOrderOrder: CreateWorkOrderOrder) => {
      const response = await fetch('/api/work-order/create-order', {
        method: 'POST',
        body: JSON.stringify(createWorkOrderOrder),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to create work order order');
      }

      const result: CreateWorkOrderOrderResponse = await response.json();
      return result;
    },
    onSuccess(...args) {
      // invalidate everything. this can change stock, work orders, etc
      queryClient.invalidateQueries();

      options?.onSuccess?.(...args);
    },
  });
};
