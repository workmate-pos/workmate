import { Fetch } from './fetch.js';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { BulkCreatePurchaseOrders } from '@web/schemas/generated/bulk-create-purchase-orders.js';
import { BulkCreatePurchaseOrdersResponse } from '@web/controllers/api/purchase-orders.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';

export const useBulkCreatePurchaseOrderMutation = (
  { fetch }: { fetch: Fetch },
  options?: UseMutationOptions<BulkCreatePurchaseOrdersResponse, unknown, BulkCreatePurchaseOrders, unknown>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bulkCreatePurchaseOrders: BulkCreatePurchaseOrders) => {
      const response = await fetch('/api/purchase-orders/bulk', {
        method: 'POST',
        body: JSON.stringify(bulkCreatePurchaseOrders),
        headers: { 'Content-Type': 'application/json' },
      });

      if (![200, 207, 500].includes(response.status)) {
        throw await response.json();
      }

      const result: BulkCreatePurchaseOrdersResponse = await response.json();
      return result;
    },
    async onSuccess(...args) {
      const bulkCreatePurchaseOrder = args[1];

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['purchase-order-info'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-item'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-items'] }),
        queryClient.invalidateQueries({ queryKey: ['reorder-plan'] }),
      ]);

      await options?.onSuccess?.(...args);
    },
  });
};
