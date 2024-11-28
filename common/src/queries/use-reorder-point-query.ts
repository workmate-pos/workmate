import { Fetch } from './fetch.js';
import { skipToken, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { ReorderPointResponse } from '@web/controllers/api/purchase-orders.js';

export const useReorderPointQuery = (
  {
    fetch,
    inventoryItemId,
    locationId,
  }: {
    fetch: Fetch;
    inventoryItemId: ID | null;
    locationId: ID | null;
  },
  options?: Partial<
    UseQueryOptions<
      ReorderPointResponse['reorderPoint'] | null,
      unknown,
      ReorderPointResponse['reorderPoint'] | null,
      (string | ID | null)[]
    >
  >,
) => {
  return useQuery({
    ...options,
    queryKey: ['reorder-point', inventoryItemId, locationId],
    queryFn: !inventoryItemId
      ? skipToken
      : async () => {
          const searchParams = new URLSearchParams();
          if (locationId) searchParams.append('locationId', locationId);

          const response = await fetch(
            `/api/purchase-orders/reorder/${encodeURIComponent(parseGid(inventoryItemId).id)}?${searchParams}`,
          );

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
