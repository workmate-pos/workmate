import type { FetchOrdersResponse } from '@web/controllers/api/order.js';
import { createPaginatedQuery } from './create-paginated-query.js';
import { PaginationOptions } from '@web/schemas/generated/pagination-options.js';

export const useOrdersQuery = createPaginatedQuery({
  endpoint: '/api/order',
  queryKeyFn: ({ query }: PaginationOptions) => ['orders', query],
  extractPage: (response: FetchOrdersResponse) => response.orders,
  cursorParamName: 'after',
});

export type Order = FetchOrdersResponse['orders'][number];
