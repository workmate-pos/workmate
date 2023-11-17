import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import { useState } from 'react';
import { useQuery } from 'react-query';

const PAGE_SIZE = 25;

export const useEmployeesQuery = ({ offset = 0, enabled = true }: { offset?: number; enabled?: boolean } = {}) => {
  const fetch = useAuthenticatedFetch();

  // TODO: Investigate https://tanstack.com/query/v4/docs/react/guides/paginated-queries
  const query = useQuery(
    ['employees', offset],
    async (): Promise<{ employees: Employee[] } | null> => {
      const searchParams = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
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

  return query;
};

export type Employee = {
  id: string;
  name: string;
};
