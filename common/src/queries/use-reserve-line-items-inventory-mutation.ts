import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Fetch } from './fetch.js';
import { ReserveInventoryForLineItemsResponse } from '@web/controllers/api/sources.js';
import { ReserveInventoryForLineItems } from '@web/schemas/generated/reserve-inventory-for-line-items.js';

export const useReserveLineItemsInventoryMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: ReserveInventoryForLineItems) => {
      const response = await fetch(`/api/sources/line-items/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to reserve inventory');
      }

      const result: ReserveInventoryForLineItemsResponse = await response.json();
      return result;
    },
    async onSuccess() {
      await queryClient.invalidateQueries();
    },
  });
};
