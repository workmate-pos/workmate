import { Fetch } from './fetch.js';
import { useQuery } from '@tanstack/react-query';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { PlanReorderResponse } from '@web/controllers/api/purchase-orders.js';

export const useReorderPlanQuery = ({ fetch, locationId }: { fetch: Fetch; locationId: ID }) =>
  useQuery({
    queryKey: ['reorder-plan', { locationId }],
    queryFn: async () => {
      const searchParams = new URLSearchParams({ locationId });
      const response = await fetch(`/api/purchase-orders/reorder/plan?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch reorder plan');
      }

      const body: PlanReorderResponse = await response.json();
      return body;
    },
  });