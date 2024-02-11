import { Fetch } from './fetch.js';
import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { CreatePurchaseOrderResponse } from '@web/controllers/api/purchase-orders.js';

export const usePurchaseOrderMutation = (
  { fetch }: { fetch: Fetch },
  options?: UseMutationOptions<CreatePurchaseOrderResponse, unknown, CreatePurchaseOrder, unknown>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (createPurchaseOrder: CreatePurchaseOrder) => {
      const response = await fetch('/api/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(createPurchaseOrder),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw await response.json();

      const result: CreatePurchaseOrderResponse = await response.json();
      return result;
    },
    onSuccess(...args) {
      const [, { name }] = args;
      if (name) {
        queryClient.invalidateQueries(['purchase-order', name]);
      }

      queryClient.invalidateQueries(['purchase-order-info']);

      options?.onSuccess?.(...args);
    },
  });
};
