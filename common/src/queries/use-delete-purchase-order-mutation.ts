import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Fetch } from './fetch.js';

export const useDeletePurchaseOrderMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const response = await fetch(`/api/purchase-orders/${encodeURIComponent(name)}`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Failed to delete purchase order');
      }
    },
    async onSuccess(_, { name }) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['purchase-order-info'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-item'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-items'] }),
      ]);

      queryClient.removeQueries({ queryKey: ['purchase-order', name] });
    },
  });
};
