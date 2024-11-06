import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import type { CalculateDraftOrderResponse } from '@web/controllers/api/work-order.js';
import type { CalculateWorkOrder } from '@web/schemas/generated/calculate-work-order.js';
import { Fetch } from './fetch.js';
import { DiscriminatedUnionPick } from '../types/DiscriminatedUnionPick.js';
import { WEEK_IN_MS } from '../time/constants.js';
import { omit, pick } from '@teifi-digital/shopify-app-toolbox/object';

export class CalculateWorkOrderError extends Error {
  constructor(
    message: string,
    public readonly errors: { field: string[]; message: string }[],
  ) {
    super(message);
  }
}

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
  options?: Partial<
    UseQueryOptions<
      CalculateDraftOrderResponse,
      Error | CalculateWorkOrderError,
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
    >
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
      let bodyText = '';

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
      }).catch(error => {
        if ('body' in error && 'response' in error) {
          bodyText = typeof error.body === 'string' ? error.body : JSON.stringify(error.body);
          return error.response;
        }

        throw error;
      });

      bodyText ||= await response.text();

      if (response.status === 400) {
        try {
          const { error, errors } = JSON.parse(bodyText);
          throw new CalculateWorkOrderError(error, errors);
        } catch (error) {
          if (error instanceof SyntaxError) {
            // not json - fallthrough
          } else {
            throw error;
          }
        }
      }

      if (!response.ok) throw new Error(bodyText);

      const calculateDraftOrderResponse: CalculateDraftOrderResponse = JSON.parse(bodyText);

      return calculateDraftOrderResponse;
    },
    retry: (failureCount, error) => {
      if (error instanceof CalculateWorkOrderError) {
        return false;
      }

      return failureCount < 3;
    },
  });

  const data = query.data
    ? omit(query.data, 'lineItems', 'itemLineItemIds', 'itemPrices', 'chargeLineItemIds', 'chargePrices')
    : undefined;

  return {
    ...query,
    data,

    getItemLineItem: ({ uuid }: { uuid: string }) => {
      return query.data?.lineItems?.find(li => li.id === query.data?.itemLineItemIds?.[uuid]);
    },

    getItemPrice: ({ uuid }: { uuid: string }) => {
      return query.data?.itemPrices?.[uuid];
    },

    getChargeLineItem: ({ uuid }: { uuid: string }) => {
      const lineItemId = query.data?.chargeLineItemIds?.[uuid];
      return query.data?.lineItems?.find(lineItem => lineItem.id === lineItemId);
    },

    getChargePrice: (charge: DiscriminatedUnionPick<CalculateWorkOrder['charges'][number], 'type' | 'uuid'>) => {
      return query.data?.chargePrices?.[charge.uuid];
    },
  };
};
