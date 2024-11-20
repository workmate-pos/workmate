import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { Fetch } from './fetch.js';
import { BulkDeleteWorkOrders } from '@web/schemas/generated/bulk-delete-work-orders.js';
import { BulkDeleteWorkOrdersResponse } from '@web/controllers/api/work-order.js';

export const useBulkDeleteWorkOrderMutation = (
  { fetch }: { fetch: Fetch },
  options?: UseMutationOptions<BulkDeleteWorkOrdersResponse, unknown, BulkDeleteWorkOrders, unknown>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bulkDeleteWorkOrders: BulkDeleteWorkOrders) => {
      const response = await fetch(`/api/work-order/bulk`, {
        method: 'DELETE',
        body: JSON.stringify(bulkDeleteWorkOrders),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw await response.json();
      }

      const result: BulkDeleteWorkOrdersResponse = await response.json();
      return result;
    },
    async onSuccess(...args) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['work-order-info'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-item'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-items'] }),
      ]);

      const [{ workOrders }] = args;

      for (const workOrder of workOrders) {
        if (workOrder.type === 'success') {
          queryClient.removeQueries({ queryKey: ['work-order', workOrder.workOrder.name] });
        }
      }

      await options?.onSuccess?.(...args);
    },
  });
};
