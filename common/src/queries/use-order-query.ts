import { useQueries, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { Fetch } from './fetch.js';
import type { ID } from '@web/services/gql/queries/generated/schema.js';
import type { FetchOrderResponse } from '@web/controllers/api/order.js';
import { parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';

export const useOrderQuery = (
  { fetch, id }: { fetch: Fetch; id: ID | null },
  options?: UseQueryOptions<
    { order: FetchOrderResponse | null },
    unknown,
    { order: FetchOrderResponse | null },
    (string | null)[]
  >,
) => {
  return useQuery({
    ...options,
    queryKey: ['order', id],
    queryFn: async () => {
      if (id === null) {
        return { order: null };
      }

      const response = await fetch(`/api/order/${parseGid(id).id}`);

      if (!response.ok) {
        throw new Error(`useOrderQuery HTTP Status ${response.status}`);
      }

      const order: FetchOrderResponse = await response.json();
      return { order };
    },
  });
};

export const useOrderQueries = ({ fetch, ids }: { fetch: Fetch; ids: ID[] }) => {
  const queries = useQueries({
    queries: ids.map(id => ({
      queryKey: ['order', id],
      queryFn: async () => {
        const response = await fetch(`/api/order/${parseGid(id).id}`);

        if (!response.ok) {
          throw new Error(`useOrderQuery HTTP Status ${response.status}`);
        }

        const order: FetchOrderResponse = await response.json();
        return { order };
      },
    })),
  });

  return Object.fromEntries(ids.map((id, i) => [id, queries[i]!]));
};
