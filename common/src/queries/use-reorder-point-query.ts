import { Fetch } from './fetch.js';
import { useQuery } from '@tanstack/react-query';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { ReorderPointResponse } from '@web/controllers/api/purchase-orders.js';

export const useReorderPointQuery = ({
  fetch,
  inventoryItemId,
  locationId,
}: {
  fetch: Fetch;
  inventoryItemId: ID;
  locationId?: ID;
}) => {
  return useQuery({
    queryKey: ['reorder-point', inventoryItemId, locationId],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (locationId) searchParams.append('locationId', locationId);

      const response = await fetch(`/api/purchase-orders/reorder/${inventoryItemId}?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch reorder point');
      }

      const { reorderPoints }: ReorderPointResponse = await response.json();
      return reorderPoints;
    },
  });
};
