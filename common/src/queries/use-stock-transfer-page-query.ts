import { Fetch } from './fetch.js';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { StockTransferPaginationOptions } from '@web/schemas/generated/stock-transfer-pagination-options.js';
import { FetchStockTransferPageResponse } from '@web/controllers/api/stock-transfers.js';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { UseQueryData } from './react-query.js';
import { useStockTransferQuery } from './use-stock-transfer-query.js';

export const useStockTransferPageQuery = ({
  fetch,
  fromLocationId,
  toLocationId,
  ...paginationOptions
}: { fetch: Fetch } & Omit<StockTransferPaginationOptions, 'offset' | 'fromLocationId' | 'toLocationId'> & {
    fromLocationId?: ID;
    toLocationId?: ID;
  }) => {
  const queryClient = useQueryClient();

  return useInfiniteQuery({
    queryKey: ['stock-transfer-page', { ...paginationOptions, fromLocationId, toLocationId }],
    queryFn: async ({ pageParam: offset }) => {
      const searchParams = new URLSearchParams({
        offset: String(offset),
      });

      for (const [key, value] of Object.entries(paginationOptions)) {
        if (value === undefined) continue;
        searchParams.set(key, String(value));
      }

      if (fromLocationId) {
        searchParams.set('fromLocationId', parseGid(fromLocationId).id);
      }

      if (toLocationId) {
        searchParams.set('toLocationId', parseGid(toLocationId).id);
      }

      const response = await fetch(`/api/stock-transfers?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch stock transfers');
      }

      const body: FetchStockTransferPageResponse = await response.json();

      for (const stockTransfer of body) {
        queryClient.setQueryData(
          ['stock-transfer', stockTransfer.name],
          stockTransfer satisfies UseQueryData<typeof useStockTransferQuery>,
        );
      }

      return body;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length === 0) return undefined;
      return pages.flat(1).length;
    },
    select: ({ pages, pageParams }) => ({
      pages: pages.flat(1),
      pageParams,
    }),
  });
};
