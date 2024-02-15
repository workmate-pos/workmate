import { Fetch } from './fetch.js';
import { PurchaseOrder } from '@web/services/purchase-orders/types.js';
import { useQuery, UseQueryOptions } from 'react-query';
import { FetchPurchaseOrderResponse } from '@web/controllers/api/purchase-orders.js';

export const usePurchaseOrderQuery = (
  { fetch, name }: { fetch: Fetch; name: string | null },
  options?: UseQueryOptions<PurchaseOrder | null, unknown, PurchaseOrder | null, (string | null)[]>,
) =>
  useQuery({
    ...options,
    queryKey: ['purchase-order', name],
    queryFn: async () => {
      if (!name) return null;

      const response = await fetch(`/api/purchase-orders/${encodeURIComponent(name)}`);

      if (!response.ok) {
        throw new Error(`usePurchaseOrderQuery HTTP Status ${response.status}`);
      }

      const { purchaseOrder }: FetchPurchaseOrderResponse = await response.json();

      return purchaseOrder;
    },
  });
