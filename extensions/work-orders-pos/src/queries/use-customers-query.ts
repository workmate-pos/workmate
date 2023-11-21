import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import { useInfiniteQuery } from 'react-query';

const PAGE_SIZE = 25;

export const useCustomersQuery = ({ query = '' }: { query?: string } = {}) => {
  const fetch = useAuthenticatedFetch();

  return useInfiniteQuery<{ customers: Customer[] }, unknown, Customer>({
    queryKey: ['customers', query],
    queryFn: async ({ pageParam: offset = 0 }) => {
      const searchParams = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (query) searchParams.set('query', query);
      const response = await fetch(`/api/customer?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }

      return await response.json();
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.customers.length < PAGE_SIZE) return undefined;
      return pages.map(page => page.customers.length).reduce((acc, curr) => acc + curr, 0);
    },
    select: ({ pages, pageParams }) => ({
      pages: pages.flatMap(page => page.customers),
      pageParams,
    }),
    keepPreviousData: true,
  });
};

export type Customer = {
  id: string;
  name: string;
};
