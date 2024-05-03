import type { PaginationOptions } from '@web/schemas/generated/pagination-options.js';
import { createPaginatedQuery } from './create-paginated-query.js';
import { FetchDraftOrdersResponse } from '@web/controllers/api/draft-order.js';

export const useDraftOrdersQuery = createPaginatedQuery({
  endpoint: '/api/draft-order',
  queryKeyFn: (options: PaginationOptions) => ['draft-orders', options],
  extractPage: (response: FetchDraftOrdersResponse) => response.orders,
  cursorParamName: 'after',
});

export type DraftOrder = FetchDraftOrdersResponse['orders'][number];
