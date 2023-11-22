import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import { useInfiniteQuery } from 'react-query';

export const useEmployeesQuery = ({ query = '' }: { query?: string } = {}) => {
  const fetch = useAuthenticatedFetch();

  return useInfiniteQuery<
    { employees: Employee[]; pageInfo: { hasNextPage: boolean; endCursor?: string | null } },
    unknown,
    Employee
  >({
    queryKey: ['employees', query],
    queryFn: async ({ pageParam: after }) => {
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
      pages: pages.flatMap(page => page.employees),
      pageParams,
    }),
    keepPreviousData: true,
  });
};

export type Employee = {
  id: string;
  name: string;
};
