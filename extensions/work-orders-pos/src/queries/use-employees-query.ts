import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import { useInfiniteQuery } from 'react-query';

const PAGE_SIZE = 25;

export const useEmployeesQuery = ({ query = '' }: { query?: string } = {}) => {
  const fetch = useAuthenticatedFetch();

  return useInfiniteQuery<{ employees: Employee[] }, unknown, Employee>({
    queryKey: ['employees', query],
    queryFn: async ({ pageParam: offset = 0 }) => {
      const searchParams = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (query) searchParams.set('query', query);
      const response = await fetch(`/api/employee?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }

      return await response.json();
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.employees.length < PAGE_SIZE) return undefined;
      return pages.map(page => page.employees.length).reduce((acc, curr) => acc + curr, 0);
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
