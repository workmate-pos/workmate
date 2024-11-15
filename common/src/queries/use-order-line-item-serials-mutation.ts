import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { SetOrderLineItemSerials } from '@web/schemas/generated/set-order-line-item-serials.js';
import { SetOrderLineItemSerialsResponse } from '@web/controllers/api/order.js';
import { UseQueryData } from './react-query.js';
import { useOrderLineItemSerialsQuery } from './use-order-line-item-serials-query.js';
import { Fetch } from './fetch.js';

export const useOrderLineItemSerialsMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...body }: { id: ID } & SetOrderLineItemSerials) => {
      const response = await fetch(`/api/order/${encodeURIComponent(parseGid(id).id)}/line-items/serials`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to set order line item serials');
      }

      const result: SetOrderLineItemSerialsResponse = await response.json();

      queryClient.setQueryData(
        ['order-line-item-serials', id],
        result satisfies UseQueryData<typeof useOrderLineItemSerialsQuery>,
      );
    },
  });
};
