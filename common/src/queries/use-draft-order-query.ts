import { useQueries, useQuery, UseQueryOptions } from 'react-query';
import { Fetch } from './fetch.js';
import type { ID } from '@web/services/gql/queries/generated/schema.js';
import type { FetchDraftOrderResponse } from '@web/controllers/api/draft-order.js';
import { parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';

export const useDraftOrderQuery = (
  { fetch, id }: { fetch: Fetch; id: ID | null },
  options?: UseQueryOptions<
    { order: FetchDraftOrderResponse | null },
    unknown,
    { order: FetchDraftOrderResponse | null },
    (string | null)[]
  >,
) => {
  return useQuery({
    ...options,
    queryKey: ['draft-order', id],
    queryFn: async () => {
      if (id === null) {
        return { order: null };
      }

      const response = await fetch(`/api/draft-order/${parseGid(id).id}`);

      if (!response.ok) {
        throw new Error(`useDraftOrderQuery HTTP Status ${response.status}`);
      }

      const order: FetchDraftOrderResponse = await response.json();

      return { order };
    },
  });
};

export const useDraftOrderQueries = ({ fetch, ids }: { fetch: Fetch; ids: ID[] }) => {
  const queries = useQueries(
    ids.map(id => ({
      queryKey: ['draft-order', id],
      queryFn: async () => {
        const response = await fetch(`/api/draft-order/${parseGid(id).id}`);

        if (!response.ok) {
          throw new Error(`useDraft-OrderQuery HTTP Status ${response.status}`);
        }

        const order: FetchDraftOrderResponse = await response.json();

        return { order };
      },
    })),
  );
  return Object.fromEntries(ids.map((id, i) => [id, queries[i]!]));
};
