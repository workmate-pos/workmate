import { useInfiniteQuery } from 'react-query';
import type { FetchEmployeesResponse } from '@web/controllers/api/employee.js';
import { toDollars } from '../util/money.js';
import { Fetch } from './fetch.js';

export const useEmployeesQuery = ({ fetch, query = '' }: { fetch: Fetch; query?: string }) => {
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
