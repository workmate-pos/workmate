import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import { useAuthenticatedFetch } from '@teifi-digital/shopify-app-react';
import type { ID, SetRates } from '../../schemas/generated/set-rates.js';
import { Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';

export const useEmployeeRatesMutation = (options: UseMutationOptions<void, unknown, Record<string, Money | null>>) => {
  const fetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async (ratesObj: Record<string, Money | null>) => {
      const rates = Object.entries(ratesObj).map(([employeeId, rate]) => ({
        employeeId: employeeId as ID,
        rate: rate,
      }));

      if (!nonEmpty(rates)) {
        return;
      }

      const body: SetRates = { rates };
      await fetch('/api/rate', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess(...args) {
      queryClient.invalidateQueries(['employee-rate']);

      options.onSuccess?.(...args);
    },
  });
};

function nonEmpty<T>(arr: T[]): arr is [T, ...T[]] {
  return arr.length > 0;
}
