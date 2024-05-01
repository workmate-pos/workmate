import type { FetchDraftOrderLineItemsResponse } from '@web/controllers/api/draft-order.js';
import { ID } from '@web/schemas/generated/ids.js';
import { useInfiniteQuery } from 'react-query';
import { Fetch } from './fetch.js';
import { parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';

export const useDraftOrderLineItemsQuery = (
  { fetch, id = null }: { fetch: Fetch; id: ID | null },
  options?: { enabled?: boolean },
) => {
  return useInfiniteQuery({
    ...options,
    queryKey: ['draft-order-line-items', id],
    queryFn: async ({ pageParam }): Promise<FetchDraftOrderLineItemsResponse> => {
      if (id === null) {
        return { lineItems: [], pageInfo: { hasNextPage: false, endCursor: null } };
      }

      const searchParams = new URLSearchParams();
      if (pageParam) searchParams.set('after', String(pageParam));

      const response = await fetch(`/api/draft-order/${parseGid(id).id}/line-items?${searchParams}`);

      return await response.json();
    },
    select: ({ pages, pageParams }) => ({
      pages: pages.flatMap(page => page.lineItems),
      pageParams,
    }),
    getNextPageParam: lastPage => {
      if (!lastPage.pageInfo.hasNextPage) return undefined;
      return lastPage.pageInfo.endCursor;
    },
  });
};

export type DraftOrderLineItem = FetchDraftOrderLineItemsResponse['lineItems'][number];
