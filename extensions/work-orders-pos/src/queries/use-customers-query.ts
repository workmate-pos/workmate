import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import { useQuery } from 'react-query';

const PAGE_SIZE = 25;

export const useCustomersQuery = ({
  offset = 0,
  enabled = true,
  query = '',
}: { offset?: number; enabled?: boolean; query?: string } = {}) => {
  const fetch = useAuthenticatedFetch();

  // TODO: useInfiniteQuery
  return useQuery(
    ['customers', query, offset],
    async (): Promise<{ customers: Customer[] } | null> => {
      const searchParams = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (query) searchParams.set('query', query);
      const response = await fetch(`/api/customer?${searchParams}`);

      if (!response.ok) {
        return null;
      }

      return await response.json();
    },
    {
      enabled,
    },
  );
};

export type Customer = {
  id: string;
  name: string;
};
