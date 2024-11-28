import { Fetch } from './fetch.js';
import { useQuery } from '@tanstack/react-query';
import { FetchStockTransferResponse } from '@web/controllers/api/stock-transfers.js';

export const useStockTransferQuery = (
  { fetch, name }: { fetch: Fetch; name: string | null },
  options?: { staleTime?: number; enabled?: boolean },
) => {
  return useQuery({
    ...options,
    queryKey: ['stock-transfer', name],
    queryFn: async () => {
      if (!name) return null;

      const response = await fetch(`/api/stock-transfers/${encodeURIComponent(name)}`);

      if (!response.ok) {
        throw new Error('Failed to fetch stock transfer');
      }

      const body: FetchStockTransferResponse = await response.json();

      return body;
    },
  });
};
