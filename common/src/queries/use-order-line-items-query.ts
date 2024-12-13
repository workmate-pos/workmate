import type { FetchOrderLineItemsResponse } from '@web/controllers/api/order.js';
import { ID } from '@web/schemas/generated/ids.js';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Fetch } from './fetch.js';
import { parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';

export const useOrderLineItemsQuery = (
  { fetch, id = null }: { fetch: Fetch; id: ID | null },
  options?: { enabled?: boolean },
) => {
  return useInfiniteQuery({
    ...options,
    queryKey: ['order-line-items', id],
    queryFn: async ({ pageParam }): Promise<FetchOrderLineItemsResponse> => {
      if (id === null) {
        return { lineItems: [], pageInfo: { hasNextPage: false, endCursor: null } };
      }

      const searchParams = new URLSearchParams();
      if (pageParam) searchParams.set('after', String(pageParam));

      const response = await fetch(`/api/order/${parseGid(id).id}/line-items?${searchParams}`);
      return await response.json();
    },
    initialPageParam: undefined as undefined | string,
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

export type OrderLineItem = FetchOrderLineItemsResponse['lineItems'][number];
