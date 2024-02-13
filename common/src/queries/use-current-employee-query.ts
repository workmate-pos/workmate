import { Fetch } from './fetch.js';
import type { FetchMeResponse } from '@web/controllers/api/employee.js';
import { useQuery } from 'react-query';

export const useCurrentEmployeeQuery = ({ fetch }: { fetch: Fetch }) => {
  return useQuery({
    queryKey: ['employee', 'me'],
    queryFn: async () => {
      const response = await fetch('/api/employee/me');

      if (!response.ok) {
        throw new Error('Failed to fetch employee');
      }

      const results: FetchMeResponse = await response.json();
      return results.employee;
    },
  });
};
