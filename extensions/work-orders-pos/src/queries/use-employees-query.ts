import { useInfiniteQuery } from 'react-query';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import type { FetchEmployeesResponse } from '@web/controllers/api/employee';
import { toDollars } from '../util/money-utils';

export const useEmployeesQuery = ({ query = '' }: { query?: string } = {}) => {
  const fetch = useAuthenticatedFetch();

  return useInfiniteQuery({
    queryKey: ['employees', query],
    queryFn: async ({ pageParam: after }): Promise<FetchEmployeesResponse> => {
      const searchParams = new URLSearchParams();

      if (query) searchParams.set('query', query);
      if (after) searchParams.set('after', after);

      const response = await fetch(`/api/employee?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }

      return await response.json();
    },
    getNextPageParam: lastPage => {
      if (!lastPage.pageInfo.hasNextPage) return undefined;
      return lastPage.pageInfo.endCursor;
    },
    select: ({ pages, pageParams }) => ({
      pages: pages.flatMap(page =>
        page.employees.map(({ rate, ...employee }) => ({
          ...employee,
          rate: rate ? toDollars(rate) : rate,
        })),
      ),
      pageParams,
    }),
    keepPreviousData: true,
  });
};

export type Employee = {
  id: string;
  name: string;
  rate: number | null;
};
