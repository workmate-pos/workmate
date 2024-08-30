import { useQuery } from 'react-query';
import { Fetch } from './fetch.js';
import { PlanCycleCountResponse } from '@web/controllers/api/cycle-count.js';

export const usePlanCycleCountQuery = (
  { fetch, name }: { fetch: Fetch; name: string | null },
  options?: { staleTime?: number },
) =>
  useQuery({
    ...options,
    queryKey: ['cycle-count-plan', name],
    queryFn: async () => {
      if (!name) {
        return null;
      }

      const response = await fetch(`/api/cycle-count/${encodeURIComponent(name)}/plan`);

      if (!response.ok) {
        throw new Error('Failed to plan cycle count');
      }

      const result: PlanCycleCountResponse = await response.json();
      return result;
    },
  });
