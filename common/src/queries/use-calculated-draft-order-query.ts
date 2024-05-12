import { useQuery, UseQueryOptions } from 'react-query';
import type { CalculateDraftOrderResponse } from '@web/controllers/api/work-order.js';
import type { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';
import { CalculateWorkOrder } from '@web/schemas/generated/calculate-work-order.js';
import { Fetch } from './fetch.js';
import { DiscriminatedUnionPick } from '../types/DiscriminatedUnionPick.js';

export const useCalculatedDraftOrderQuery = (
  {
    fetch,
    name,
    items,
    customerId,
    charges,
    discount,
  }: { fetch: Fetch } & Pick<CreateWorkOrder, 'name' | 'items' | 'charges' | 'customerId' | 'discount'>,
  options?: UseQueryOptions<
    CalculateDraftOrderResponse,
    unknown,
    CalculateDraftOrderResponse,
    (
      | string
      | CreateWorkOrder['name']
      | CreateWorkOrder['items']
      | CreateWorkOrder['customerId']
      | CreateWorkOrder['charges']
      | CreateWorkOrder['discount']
    )[]
  >,
) => {
  const query = useQuery({
    ...options,
    queryKey: ['calculated-draft-order', name, items, customerId, charges, discount],
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

      if (!response.ok) throw new Error(await response.text());

      const calculateDraftOrderResponse: CalculateDraftOrderResponse = await response.json();

      return calculateDraftOrderResponse;
    },
  });

  const calculatedDraftOrder = query.data;

  return {
    ...query,

    getItemLineItem: (uuid: string) => {
      if (!calculatedDraftOrder) {
        return null;
      }

      const { lineItems, itemLineItemIds } = calculatedDraftOrder;

      return lineItems.find(li => li.id === itemLineItemIds[uuid]) ?? null;
    },

    getChargeLineItem: (charge: DiscriminatedUnionPick<CreateWorkOrder['charges'][number], 'type' | 'uuid'>) => {
      if (!calculatedDraftOrder) {
        return null;
      }

      if (charge.type === 'hourly-labour') {
        const lineItemId = calculatedDraftOrder.hourlyLabourChargeLineItemIds[charge.uuid];
        return calculatedDraftOrder.lineItems.find(lineItem => lineItem.id === lineItemId) ?? null;
      } else if (charge.type === 'fixed-price-labour') {
        const lineItemId = calculatedDraftOrder.fixedPriceLabourChargeLineItemIds[charge.uuid];
        return calculatedDraftOrder.lineItems.find(lineItem => lineItem.id === lineItemId) ?? null;
      }

      return charge satisfies never;
    },

    getChargePrice: (charge: DiscriminatedUnionPick<CreateWorkOrder['charges'][number], 'type' | 'uuid'>) => {
      if (!calculatedDraftOrder) {
        return null;
      }

      if (charge.type === 'hourly-labour') {
        return calculatedDraftOrder.hourlyLabourChargePrices[charge.uuid];
      } else if (charge.type === 'fixed-price-labour') {
        return calculatedDraftOrder.fixedPriceLabourChargePrices[charge.uuid];
      }

      return charge satisfies never;
    },
  };
};
