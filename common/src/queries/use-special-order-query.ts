import { useQueries, useQuery, UseQueryOptions } from 'react-query';
import { Fetch } from './fetch.js';
import { FetchSpecialOrderResponse } from '@web/controllers/api/special-orders.js';
import { DetailedSpecialOrder } from '@web/services/special-orders/types.js';

async function fetchSpecialOrder(fetch: Fetch, name: string) {
  const response = await fetch(`/api/special-orders/${encodeURIComponent(name)}`);

  if (!response.ok) {
    throw new Error('Failed to fetch special order');
  }

  const { specialOrder }: FetchSpecialOrderResponse = await response.json();
  return specialOrder;
}

export const useSpecialOrderQuery = (
  { fetch, name }: { fetch: Fetch; name: string | null },
  options?: UseQueryOptions<DetailedSpecialOrder | null, unknown, DetailedSpecialOrder | null, (string | null)[]>,
) =>
  useQuery({
    ...options,
    queryKey: ['special-order', name],
    queryFn: async () => {
      if (name === null) {
        return null;
      }

      return await fetchSpecialOrder(fetch, name);
    },
  });

export const useSpecialOrderQueries = ({ fetch, names }: { fetch: Fetch; names: string[] }) => {
  return useQueries(
    names.map(name => ({
      queryKey: ['special-order', name],
      queryFn: () => fetchSpecialOrder(fetch, name),
    })),
  );
};
