import { Fetch } from './fetch.js';
import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { CreatePurchaseOrderResponse } from '@web/controllers/api/purchase-orders.js';
import { UseQueryData } from './react-query.js';
import { usePurchaseOrderQuery } from './use-purchase-order-query.js';

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
      const [{ purchaseOrder }] = args;

      queryClient.invalidateQueries(['purchase-order', purchaseOrder.name]);
      queryClient.invalidateQueries(['purchase-order-info']);

      // we don't know if any items were removed so we must invalidate all inventory items
      queryClient.invalidateQueries(['inventory-item']);
      queryClient.invalidateQueries(['inventory-items']);

      queryClient.setQueryData(
        ['purchase-order', purchaseOrder.name],
        purchaseOrder satisfies UseQueryData<typeof usePurchaseOrderQuery>,
      );

      options?.onSuccess?.(...args);
    },
  });
};
