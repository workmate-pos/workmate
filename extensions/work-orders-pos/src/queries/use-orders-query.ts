import { useInfiniteQuery } from 'react-query';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import type { FetchOrdersResponse } from '@web/controllers/api/order';

export const useOrdersQuery = ({ query = '' }: { query?: string } = {}) => {
  const fetch = useAuthenticatedFetch();

  return useInfiniteQuery({
    queryKey: ['orders', query],
    queryFn: async ({ pageParam: after }): Promise<FetchOrdersResponse> => {
      const searchParams = new URLSearchParams();

      if (query) searchParams.set('query', query);
      if (after) searchParams.set('after', after);

      const response = await fetch(`/api/order?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      return await response.json();
    },
    getNextPageParam: lastPage => {
      if (!lastPage.pageInfo.hasNextPage) return undefined;
      return lastPage.pageInfo.endCursor;
    },
    select: ({ pages, pageParams }) => ({
      pages: pages.flatMap(page => page.orders),
      pageParams,
    }),
    keepPreviousData: true,
  });
};

export type Order = FetchOrdersResponse['orders'][number];
