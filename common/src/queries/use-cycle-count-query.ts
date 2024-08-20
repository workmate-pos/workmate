import { Fetch } from './fetch.js';
import { useQuery } from 'react-query';
import { FetchCycleCountResponse } from '@web/controllers/api/cycle-count.js';

export const useCycleCountQuery = (
  { fetch, name }: { fetch: Fetch; name: string | null },
  options?: { staleTime?: number },
) =>
  useQuery({
    ...options,
    queryKey: ['cycle-count', name],
    queryFn: async () => {
      if (!name) {
        return null;
      }

      const response = await fetch(`/api/cycle-count/${encodeURIComponent(name)}`);

      if (!response.ok) {
        throw new Error('Failed to fetch cycle count');
      }

      const result: FetchCycleCountResponse = await response.json();
      return result;
    },
  });
