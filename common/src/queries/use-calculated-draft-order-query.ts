import { useQuery, UseQueryOptions } from 'react-query';
import type { CalculateDraftOrderResponse } from '@web/controllers/api/work-order.js';
import type { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';
import { CalculateWorkOrder } from '@web/schemas/generated/calculate-work-order.js';
import { Fetch } from './fetch.js';

export const useCalculatedDraftOrderQuery = (
  { fetch, items, customerId, charges }: { fetch: Fetch } & Pick<CreateWorkOrder, 'items' | 'charges' | 'customerId'>,
  options?: UseQueryOptions<
    { calculateDraftOrderResponse?: CalculateDraftOrderResponse },
    unknown,
    { calculateDraftOrderResponse?: CalculateDraftOrderResponse },
    (string | CreateWorkOrder['items'] | CreateWorkOrder['customerId'] | CreateWorkOrder['charges'])[]
  >,
) =>
  useQuery({
    ...options,
    queryKey: ['calculated-draft-order', items, customerId, charges],
    queryFn: async () => {
      const response = await fetch('/api/work-order/calculate-draft-order', {
        method: 'POST',
        body: JSON.stringify({
          items,
          customerId,
          charges,
        } satisfies CalculateWorkOrder),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error(await response.text());

      const calculateDraftOrderResponse: CalculateDraftOrderResponse = await response.json();

      return { calculateDraftOrderResponse } as const;
    },
  });
