import type { FetchServiceProductVariantsResponse } from '@web/controllers/api/service-product-variant.js';
import { createPaginatedQuery } from './create-paginated-query.js';
import { PaginationOptions } from '@web/schemas/generated/pagination-options.js';

export const useServiceProductVariants = createPaginatedQuery({
  endpoint: '/api/service-product-variant',
  queryKeyFn: ({ query }: PaginationOptions) => ['service-products', query],
  extractPage: (response: FetchServiceProductVariantsResponse) => response.productVariants,
  cursorParamName: 'after',
});
