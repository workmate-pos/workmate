import type { FetchOrdersResponse } from '@web/controllers/api/order.js';
import type { PaginationOptions } from '@web/schemas/generated/pagination-options.js';
import { createPaginatedQuery } from './create-paginated-query.js';

export const useOrdersQuery = createPaginatedQuery({
  endpoint: '/api/order',
  queryKeyFn: (options: PaginationOptions) => ['orders', options],
  extractPage: (response: FetchOrdersResponse) => response.orders,
  cursorParamName: 'after',
});

export type Order = FetchOrdersResponse['orders'][number];
