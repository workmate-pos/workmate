import { PurchaseOrderPaginationOptions } from '@web/schemas/generated/purchase-order-pagination-options.js';
import { Fetch } from './fetch.js';
import { useInfiniteQuery, UseInfiniteQueryOptions } from 'react-query';
import { FetchPurchaseOrderInfoPageResponse } from '@web/controllers/api/purchase-orders.js';
import { PurchaseOrderInfo } from '@web/services/purchase-orders/types.js';

export const usePurchaseOrderInfoPageQuery = (
  { fetch, ...params }: Omit<PurchaseOrderPaginationOptions, 'offset' | 'limit'> & { fetch: Fetch },
  options?: UseInfiniteQueryOptions<
    PurchaseOrderInfo[],
    unknown,
    PurchaseOrderInfo,
    PurchaseOrderInfo[],
    (string | Omit<PurchaseOrderPaginationOptions, 'offset' | 'limit'>)[]
  >,
) =>
  useInfiniteQuery({
    ...options,
    queryKey: ['purchase-order-info', params],
    queryFn: async ({ pageParam: offset = 0 }) => {
      const searchParams = new URLSearchParams();

      for (const [key, value] of Object.entries({ ...params, offset, limit: 10 })) {
        if (value === undefined) continue;
        searchParams.set(key, String(value));
      }

      const response = await fetch(`/api/purchase-orders?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch purchase order info');
      }

      const result: FetchPurchaseOrderInfoPageResponse = await response.json();
      return result.purchaseOrders;
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length === 0) return undefined;
      return pages.flat(1).length;
    },
    select: ({ pages, pageParams }) => ({
      pages: pages.flat(1),
      pageParams,
    }),
  });
