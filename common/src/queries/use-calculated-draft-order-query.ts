import { useQuery, UseQueryOptions } from 'react-query';
import type { CalculateDraftOrderResponse } from '@web/controllers/api/work-order.js';
import type { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';
import { CalculateWorkOrder } from '@web/schemas/generated/calculate-work-order.js';
import { Fetch } from './fetch.js';

export const useCalculatedDraftOrderQuery = (
  {
    fetch,
    lineItems,
    customerId,
    charges,
    discount,
  }: { fetch: Fetch } & Pick<CreateWorkOrder, 'lineItems' | 'charges' | 'discount'> & {
      customerId: CreateWorkOrder['customerId'] | null;
    },
  options?: UseQueryOptions<
    { calculateDraftOrderResponse?: CalculateDraftOrderResponse },
    unknown,
    { calculateDraftOrderResponse?: CalculateDraftOrderResponse },
    (
      | string
      | CreateWorkOrder['lineItems']
      | CreateWorkOrder['customerId']
      | CreateWorkOrder['charges']
      | CreateWorkOrder['discount']
    )[]
  >,
) =>
  useQuery({
    ...options,
    queryKey: ['calculated-draft-order', lineItems, customerId, charges, discount],
    queryFn: async () => {
      const response = await fetch('/api/work-order/calculate-draft-order', {
        method: 'POST',
        body: JSON.stringify({
          lineItems,
          customerId,
          charges,
          discount,
        } satisfies CalculateWorkOrder),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error(await response.text());

      const calculateDraftOrderResponse: CalculateDraftOrderResponse = await response.json();

      return { calculateDraftOrderResponse } as const;
    },
  });
