import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Fetch } from './fetch.js';
import { ReorderPoints } from '@web/schemas/generated/reorder-points.js';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';

export const useDeleteReorderPointMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inventoryItemId, locationId }: { inventoryItemId: ID; locationId: ID | null }) => {
      const response = await fetch(`/api/purchase-orders/reorder/${encodeURIComponent(parseGid(inventoryItemId).id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: locationId ?? undefined } satisfies ReorderPoints),
      });

      if (!response.ok) {
        throw new Error('Failed to delete reorder point');
      }
    },
    async onSuccess(_, { locationId, inventoryItemId }) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['reorder-points'] }),
        queryClient.invalidateQueries({ queryKey: ['reorder-point', inventoryItemId, locationId] }),
      ]);
    },
  });
};
