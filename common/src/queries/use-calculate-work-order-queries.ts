import { Fetch } from './fetch.js';
import { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';
import { useQueries } from 'react-query';
import { CalculateWorkOrder } from '@web/schemas/generated/calculate-work-order.js';
import type { CalculateDraftOrderResponse } from '@web/controllers/api/work-order.js';

export const useCalculateWorkOrderQueries = ({
  fetch,
  workOrders,
}: {
  fetch: Fetch;
  workOrders: {
    name: string;
    items: CreateWorkOrder['items'];
    customerId: CreateWorkOrder['customerId'];
    charges: CreateWorkOrder['charges'];
    discount: CreateWorkOrder['discount'];
  }[];
}) => {
  const queries = useQueries(
    workOrders.map(({ name, items, customerId, charges, discount }) => ({
      queryKey: ['calculated-work-order', name, items, customerId, charges, discount],
      queryFn: async () => {
        const response = await fetch('/api/work-order/calculate-draft-order', {
          method: 'POST',
          body: JSON.stringify({
            name,
            items,
            customerId,
            charges,
            discount,
          } satisfies CalculateWorkOrder),
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error('Failed to calculate work order');
        }

        const result: CalculateDraftOrderResponse = await response.json();
        return result;
      },
    })),
  );

  return Object.fromEntries(workOrders.map(({ name }, i) => [name, queries[i]!]));
};
