import { useInfiniteQuery } from 'react-query';
import type { FetchCustomersResponse } from '@web/controllers/api/customer.js';
import { Fetch } from './fetch.js';

export const useCustomersQuery = ({ fetch, query = '' }: { fetch: Fetch; query?: string }) => {
  return useInfiniteQuery({
    queryKey: ['customers', query],
    queryFn: async ({ pageParam: after }: { pageParam?: string }): Promise<FetchCustomersResponse> => {
      const searchParams = new URLSearchParams();

      if (query) searchParams.set('query', query);
      if (after) searchParams.set('after', after);

      const response = await fetch(`/api/customer?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }

      return await response.json();
    },
    getNextPageParam: lastPage => {
      if (!lastPage.pageInfo.hasNextPage) return undefined;
      return lastPage.pageInfo.endCursor;
    },
    select: ({ pages, pageParams }) => ({
      pages: pages.flatMap(page => page.customers),
      pageParams,
    }),
    keepPreviousData: true,
  });
};

export type Customer = FetchCustomersResponse['customers'][number];
