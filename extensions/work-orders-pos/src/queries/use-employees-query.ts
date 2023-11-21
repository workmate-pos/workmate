import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import { useQuery } from 'react-query';

const PAGE_SIZE = 25;

export const useEmployeesQuery = ({
  offset = 0,
  enabled = true,
  query = '',
}: { offset?: number; enabled?: boolean; query?: string } = {}) => {
  const fetch = useAuthenticatedFetch();

  // TODO: Investigate https://tanstack.com/query/v4/docs/react/guides/paginated-queries
  return useQuery(
    ['employees', query, offset],
    async (): Promise<{ employees: Employee[] } | null> => {
      const searchParams = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (query) searchParams.set('query', query);
      const response = await fetch(`/api/employee?${searchParams}`);

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

export type Employee = {
  id: string;
  name: string;
};
