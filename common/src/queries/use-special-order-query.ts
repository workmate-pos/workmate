import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { Fetch } from './fetch.js';
import { FetchSpecialOrderResponse } from '@web/controllers/api/special-orders.js';
import { DetailedSpecialOrder } from '@web/services/special-orders/types.js';

export const useSpecialOrderQuery = (
  { fetch, name }: { fetch: Fetch; name: string | null },
  options?: Partial<
    UseQueryOptions<DetailedSpecialOrder | null, unknown, DetailedSpecialOrder | null, (string | null)[]>
  >,
) =>
  useQuery({
    ...options,
    queryKey: ['special-order', name],
    queryFn: async () => {
      if (name === null) {
        return null;
      }

      const response = await fetch(`/api/special-orders/${encodeURIComponent(name)}`);

      if (!response.ok) {
        throw new Error('Failed to fetch special order');
      }

      const { specialOrder }: FetchSpecialOrderResponse = await response.json();
      return specialOrder;
    },
  });
