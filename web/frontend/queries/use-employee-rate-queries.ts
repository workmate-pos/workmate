import { useQueries, UseQueryOptions } from 'react-query';
import { useAuthenticatedFetch } from '@teifi-digital/shopify-app-react';
import { FetchRatesResponse } from '../../controllers/api/rate';
import { toDollars } from '../util/money';
import { useBatcher } from '../hooks/use-batcher';

const useEmployeeRateBatcher = () => {
  const fetch = useAuthenticatedFetch();

  const batcher = useBatcher<string, BatchResult>({
    name: 'employee-rates',
    handler: async (ids: string[]) => {
      if (ids.length === 0) {
        return [];
      }

      const searchParams = new URLSearchParams();

      for (const id of ids) {
        searchParams.append('ids', id);
      }

      const response = await fetch(`/api/rate?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch rates');
      }

      const results: FetchRatesResponse = await response.json();

      const record = Object.fromEntries(results.rates.map(({ employeeId, rate }) => [employeeId, toDollars(rate)]));
      return ids.map(id => ({ id, rate: record[id] ?? null }));
    },
  });

  return batcher;
};

type BatchResult = { id: string; rate: number | null };

export const useEmployeeRateQueries = (
  ids: string[],
  options?: UseQueryOptions<BatchResult, unknown, BatchResult, ['employee-rate', string]>,
) => {
  const batcher = useEmployeeRateBatcher();

  const queries = useQueries(
    ids.map(
      id =>
        ({
          ...options,
          queryKey: ['employee-rate', id],
          queryFn: async () => {
            return await batcher.fetch(id);
          },
        }) satisfies UseQueryOptions<BatchResult, unknown, BatchResult, ['employee-rate', string]>,
    ),
  );

  return Object.fromEntries(ids.map((id, i) => [id, queries[i]]));
};
