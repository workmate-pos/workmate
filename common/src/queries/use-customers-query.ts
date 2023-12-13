import type { FetchCustomersResponse } from '@web/controllers/api/customer.js';
import { createPaginatedQuery } from './create-paginated-query.js';
import { PaginationOptions } from '@web/schemas/generated/pagination-options.js';

export const useCustomersQuery = createPaginatedQuery({
  endpoint: '/api/customer',
  queryKeyFn: ({ query }: PaginationOptions) => ['customers', query],
  extractPage: (response: FetchCustomersResponse) => response.customers,
  cursorParamName: 'after',
});

export type Customer = FetchCustomersResponse['customers'][number];
