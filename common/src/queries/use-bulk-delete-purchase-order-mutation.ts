import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { Fetch } from './fetch.js';
import { BulkDeletePurchaseOrders } from '@web/schemas/generated/bulk-delete-purchase-orders.js';
import { BulkDeletePurchaseOrdersResponse } from '@web/controllers/api/purchase-orders.js';

export const useBulkDeletePurchaseOrderMutation = (
  { fetch }: { fetch: Fetch },
  options?: UseMutationOptions<BulkDeletePurchaseOrdersResponse, unknown, BulkDeletePurchaseOrders, unknown>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bulkDeletePurchaseOrders: BulkDeletePurchaseOrders) => {
      const response = await fetch(`/api/purchase-orders/bulk`, {
        method: 'DELETE',
        body: JSON.stringify(bulkDeletePurchaseOrders),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw await response.json();
      }

      const result: BulkDeletePurchaseOrdersResponse = await response.json();
      return result;
    },
    async onSuccess(...args) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['purchase-order-info'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-item'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-items'] }),
      ]);

      const [{ purchaseOrders }] = args;

      for (const purchaseOrder of purchaseOrders) {
        if (purchaseOrder.type === 'success') {
          queryClient.removeQueries({ queryKey: ['purchase-order', purchaseOrder.purchaseOrder.name] });
        }
      }

      await options?.onSuccess?.(...args);
    },
  });
};
