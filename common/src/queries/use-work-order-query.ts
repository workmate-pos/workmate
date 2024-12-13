import { useQueries, useQuery, UseQueryOptions } from '@tanstack/react-query';
import type { FetchWorkOrderResponse } from '@web/controllers/api/work-order.js';
import type { DetailedWorkOrder } from '@web/services/work-orders/types.js';
import { Fetch } from './fetch.js';

export const useWorkOrderQuery = (
  { fetch, name }: { fetch: Fetch; name: string | null },
  options?: Partial<
    UseQueryOptions<
      { workOrder: DetailedWorkOrder | null },
      unknown,
      { workOrder: DetailedWorkOrder | null },
      (string | null)[]
    >
  >,
) =>
  useQuery({
    ...options,
    queryKey: ['work-order', name],
    queryFn: async () => {
      if (!name) return { workOrder: null };

      return await fetchWorkOrder(name, fetch);
    },
  });

export const useWorkOrderQueries = (
  { fetch, names }: { fetch: Fetch; names: string[] },
  options?: { enabled?: boolean; staleTime?: number },
) => {
  const queries = useQueries({
    queries: names.map(name => ({
      ...options,
      queryKey: ['work-order', name],
      queryFn: () => fetchWorkOrder(name, fetch),
    })),
  });
  return Object.fromEntries(names.map((name, i) => [name, queries[i]!]));
};

async function fetchWorkOrder(name: string, fetch: Fetch) {
  const response = await fetch(`/api/work-order/${encodeURIComponent(name)}`);

  if (!response.ok) {
    throw new Error(`useWorkOrderQuery HTTP Status ${response.status}`);
  }

  const workOrder: FetchWorkOrderResponse = await response.json();

  return { workOrder };
}
