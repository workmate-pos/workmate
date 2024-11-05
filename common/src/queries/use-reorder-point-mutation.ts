import { Fetch } from './fetch.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { CreateReorderPointResponse } from '@web/controllers/api/purchase-orders.js';

export const useReorderPointMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { inventoryItemId: ID; locationId?: ID; min: number; max: number }) => {
      const response = await fetch('/api/purchase-orders/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to create reorder point');
      }

      const data: CreateReorderPointResponse = await response.json();
      return data;
    },
    onSuccess: async (data, variables) => {
      // Invalidate relevant queries
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['reorder-point', variables.inventoryItemId, variables.locationId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['reorder-points'],
        }),
      ]);
    },
  });
};
