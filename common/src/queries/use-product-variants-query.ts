import type { FetchProductsResponse } from '@web/controllers/api/product-variant.js';
import { createPaginatedQuery } from './create-paginated-query.js';
import { PaginationOptions } from '@web/schemas/generated/pagination-options.js';

export const useProductVariantsQuery = createPaginatedQuery({
  endpoint: '/api/product-variant',
  queryKeyFn: ({ query }: PaginationOptions) => ['products', query],
  extractPage: (response: FetchProductsResponse) => response.productVariants,
  cursorParamName: 'after',
});

export type ProductVariant = FetchProductsResponse['productVariants'][number];
