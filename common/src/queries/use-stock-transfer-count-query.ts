import { Fetch } from './fetch.js';
import { useQuery } from '@tanstack/react-query';
import { FetchStockTransferCountResponse } from '@web/controllers/api/stock-transfers.js';
import { StockTransferCountOptions } from '@web/schemas/generated/stock-transfer-count-options.js';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';

export const useStockTransferCountQuery = (
  {
    fetch,
    ...countOptions
  }: { fetch: Fetch } & Omit<StockTransferCountOptions, 'fromLocationId' | 'toLocationId'> & {
      fromLocationId?: ID;
      toLocationId?: ID;
    },
  options?: { retry?: number; refetchInterval?: number },
) => {
  return useQuery({
    ...options,
    queryKey: ['stock-transfer-count', countOptions],
    queryFn: async () => {
      const searchParams = new URLSearchParams();

      for (const [key, value] of Object.entries(countOptions)) {
        if (value === undefined) continue;
        searchParams.set(key, String(value));
      }

      if (countOptions.fromLocationId) {
        searchParams.set('fromLocationId', parseGid(countOptions.fromLocationId).id);
      }

      if (countOptions.toLocationId) {
        searchParams.set('toLocationId', parseGid(countOptions.toLocationId).id);
      }

      const response = await fetch(`/api/stock-transfers/count?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch stock transfer count');
      }

      const body: FetchStockTransferCountResponse = await response.json();

      return body;
    },
  });
};
