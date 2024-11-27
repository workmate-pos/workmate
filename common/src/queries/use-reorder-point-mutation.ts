import { Fetch } from './fetch.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateReorderPointResponse } from '@web/controllers/api/purchase-orders.js';
import { CreateReorderPoint } from '@web/schemas/generated/create-reorder-point.js';
import { UseQueryData } from './react-query.js';
import { useReorderPointQuery } from './use-reorder-point-query.js';

export const useReorderPointMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateReorderPoint) => {
      const response = await fetch('/api/purchase-orders/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to create reorder point');
      }

      const data: CreateReorderPointResponse = await response.json();
      return data;
    },
    onSuccess: async data => {
      await queryClient.invalidateQueries({
        queryKey: ['reorder-points'],
      });

      queryClient.setQueryData<UseQueryData<typeof useReorderPointQuery>>(
        ['reorder-point', data.reorderPoint.inventoryItemId, data.reorderPoint.locationId],
        data.reorderPoint,
      );
    },
  });
};
