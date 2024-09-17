import { Fetch } from './fetch.js';
import { useQuery } from '@tanstack/react-query';
import { PlanWorkOrderOrderResponse } from '@web/controllers/api/work-order.js';

export const usePlanWorkOrderOrderQuery = (
  {
    fetch,
    name,
    items,
    charges,
  }: {
    fetch: Fetch;
    name: string;
    items: { type: 'product' | 'custom-item'; uuid: string }[];
    charges: { type: 'hourly-labour' | 'fixed-price-labour'; uuid: string }[];
  },
  options?: { enabled?: boolean },
) =>
  useQuery({
    ...options,
    queryKey: ['plan-work-order-order', name, { items, charges }],
    staleTime: 0,
    queryFn: async () => {
      const searchParams = new URLSearchParams();

      searchParams.append('name', name);

      for (const { type, uuid } of items) {
        searchParams.append('itemTypes', type);
        searchParams.append('itemUuids', uuid);
      }

      for (const { type, uuid } of charges) {
        searchParams.append('chargeTypes', type);
        searchParams.append('chargeUuids', uuid);
      }

      const response = await fetch(`/api/work-order/plan-order?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch plan work order order');
      }

      const draftInput: PlanWorkOrderOrderResponse = await response.json();
      return draftInput;
    },
  });
