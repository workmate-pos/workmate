import { Fetch } from './fetch.js';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { skipToken, useQuery } from '@tanstack/react-query';
import { FetchOrderLineItemSerialsResponse } from '@web/controllers/api/order.js';

export const useOrderLineItemSerialsQuery = ({ fetch, id }: { fetch: Fetch; id: ID | null }) =>
  useQuery({
    queryKey: ['order-line-item-serials', id],
    queryFn: !id
      ? skipToken
      : async () => {
          const response = await fetch(`/api/order/${encodeURIComponent(parseGid(id).id)}/line-items/serials`);

          if (response.status === 404) {
            const result: FetchOrderLineItemSerialsResponse = [];
            return result;
          }

          if (!response.ok) {
            throw new Error('Failed to fetch order line item serials');
          }

          const result: FetchOrderLineItemSerialsResponse = await response.json();
          return result;
        },
  });
