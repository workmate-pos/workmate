import type { FetchVendorsResponse } from '@web/controllers/api/vendors.js';
import type { PaginationOptions } from '@web/schemas/generated/pagination-options.js';
import { createPaginatedQuery } from './create-paginated-query.js';

export const useVendorsQuery = createPaginatedQuery({
  endpoint: '/api/vendors',
  queryKeyFn: ({ query }: PaginationOptions) => ['vendors', query],
  extractPage: (response: FetchVendorsResponse) => response.vendors,
  cursorParamName: 'after',
});

export type Vendor = FetchVendorsResponse['vendors'][number];
