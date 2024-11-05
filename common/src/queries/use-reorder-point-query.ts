import { Fetch } from './fetch.js';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { ReorderPointResponse } from '@web/controllers/api/purchase-orders.js';

export const useReorderPointQuery = (
  {
    fetch,
    inventoryItemId,
    locationId,
  }: {
    fetch: Fetch;
    inventoryItemId: ID;
    locationId?: ID;
  },
  options?: Partial<
    UseQueryOptions<
      ReorderPointResponse['reorderPoint'] | null,
      unknown,
      ReorderPointResponse['reorderPoint'] | null,
      (string | ID)[]
    >
  >,
) => {
  return useQuery({
    ...options,
    queryKey: ['reorder-point', inventoryItemId, locationId ?? ''],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (locationId?.trim()) searchParams.append('locationId', locationId);

      const encodedInventoryItemId = encodeURIComponent(inventoryItemId.toString());

      const response = await fetch(`/api/purchase-orders/reorder/${encodedInventoryItemId}?${searchParams}`);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch reorder point');
      }

      const { reorderPoint }: ReorderPointResponse = await response.json();
      return reorderPoint;
    },
  });
};
