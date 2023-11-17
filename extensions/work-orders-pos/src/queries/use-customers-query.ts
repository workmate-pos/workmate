import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import { useQuery } from 'react-query';

const PAGE_SIZE = 25;

export const useCustomersQuery = ({ offset = 0, enabled = true }: { offset?: number; enabled?: boolean } = {}) => {
  const fetch = useAuthenticatedFetch();

  const query = useQuery(
    ['customers', offset],
    async (): Promise<{ customers: Customer[] } | null> => {
      const searchParams = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
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

  return query;
};

export type Customer = {
  id: string;
  name: string;
};
