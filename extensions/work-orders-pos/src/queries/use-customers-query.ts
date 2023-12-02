import { useInfiniteQuery } from 'react-query';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import type { FetchCustomersResponse } from '@web/controllers/api/customer';

export const useCustomersQuery = ({ query = '' }: { query?: string } = {}) => {
  const fetch = useAuthenticatedFetch();

  return useInfiniteQuery({
    queryKey: ['customers', query],
    queryFn: async ({ pageParam: after }): Promise<FetchCustomersResponse> => {
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
