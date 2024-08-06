import { useQuery, UseQueryOptions } from 'react-query';
import type { CalculateDraftOrderResponse } from '@web/controllers/api/work-order.js';
import type { CalculateWorkOrder } from '@web/schemas/generated/calculate-work-order.js';
import { Fetch } from './fetch.js';
import { DiscriminatedUnionPick } from '../types/DiscriminatedUnionPick.js';
import { WEEK_IN_MS } from '../time/constants.js';

export const useCalculatedDraftOrderQuery = (
  {
    fetch,
    name,
    items,
    customerId,
    charges,
    discount,
    companyLocationId,
    companyContactId,
    companyId,
    paymentTerms,
  }: { fetch: Fetch } & Pick<
    CalculateWorkOrder,
    | 'name'
    | 'items'
    | 'charges'
    | 'customerId'
    | 'discount'
    | 'companyLocationId'
    | 'companyContactId'
    | 'companyId'
    | 'paymentTerms'
  >,
  options?: UseQueryOptions<
    CalculateDraftOrderResponse,
    unknown,
    CalculateDraftOrderResponse,
    (
      | string
      | CalculateWorkOrder['name']
      | CalculateWorkOrder['items']
      | CalculateWorkOrder['customerId']
      | CalculateWorkOrder['charges']
      | CalculateWorkOrder['discount']
      | CalculateWorkOrder['companyLocationId']
      | CalculateWorkOrder['companyContactId']
      | CalculateWorkOrder['companyId']
      | CalculateWorkOrder['paymentTerms']
    )[]
  >,
) => {
  const query = useQuery({
    ...options,
    staleTime: WEEK_IN_MS,
    queryKey: [
      'calculated-draft-order',
      name,
      items,
      customerId,
      charges,
      discount,
      companyLocationId,
      companyContactId,
      companyId,
      paymentTerms,
    ],
    queryFn: async () => {
      const response = await fetch('/api/work-order/calculate-draft-order', {
        method: 'POST',
        body: JSON.stringify({
          name,
          items,
          customerId,
          charges,
          discount,
          companyLocationId,
          companyContactId,
          companyId,
          paymentTerms,
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

    getItemLineItem: ({ uuid, type }: DiscriminatedUnionPick<CalculateWorkOrder['items'][number], 'type' | 'uuid'>) => {
      if (!calculatedDraftOrder) {
        return undefined;
      }

      const { lineItems, itemLineItemIds, customItemLineItemIds } = calculatedDraftOrder;

      const lineItemByUuid = (() => {
        if (type === 'product') {
          return itemLineItemIds;
        }

        if (type === 'custom-item') {
          return customItemLineItemIds;
        }

        return type satisfies never;
      })();

      return lineItems.find(li => li.id === lineItemByUuid[uuid]) ?? null;
    },

    getItemPrice: ({ uuid, type }: Pick<CalculateWorkOrder['items'][number], 'uuid' | 'type'>) => {
      if (!calculatedDraftOrder) {
        return undefined;
      }

      if (type === 'product') {
        return calculatedDraftOrder.itemPrices[uuid];
      }

      if (type === 'custom-item') {
        return calculatedDraftOrder.customItemPrices[uuid];
      }

      return type satisfies never;
    },

    getChargeLineItem: (charge: DiscriminatedUnionPick<CalculateWorkOrder['charges'][number], 'type' | 'uuid'>) => {
      if (!calculatedDraftOrder) {
        return undefined;
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

    getChargePrice: (charge: DiscriminatedUnionPick<CalculateWorkOrder['charges'][number], 'type' | 'uuid'>) => {
      if (!calculatedDraftOrder) {
        return undefined;
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
