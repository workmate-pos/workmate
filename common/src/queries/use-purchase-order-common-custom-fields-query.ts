import { Fetch } from './fetch.js';
import { useQuery } from 'react-query';
import { FetchPurchaseOrderCustomFieldsResponse } from '@web/controllers/api/purchase-orders.js';
import { OffsetPaginationOptions } from '@web/schemas/generated/offset-pagination-options.js';

export const usePurchaseOrderCommonCustomFieldsQuery = ({
  fetch,
  query,
  first,
  offset,
}: { fetch: Fetch } & OffsetPaginationOptions) =>
  useQuery({
    queryKey: ['purchase-order-common-custom-fields', { query, first, offset }],
    queryFn: async () => {
      const searchParams = new URLSearchParams();

      if (query) searchParams.set('query', query);
      if (first) searchParams.set('first', first.toString());
      if (offset) searchParams.set('offset', offset.toString());

      const response = await fetch(`/api/purchase-order/common-custom-fields?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch purchase order common custom fields');
      }

      const { customFields }: FetchPurchaseOrderCustomFieldsResponse = await response.json();
      return customFields;
    },
  });
