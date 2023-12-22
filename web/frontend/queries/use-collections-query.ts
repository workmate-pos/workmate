import type { FetchCollectionsResponse } from '../../controllers/api/collection.js';
import type { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import { createPaginatedQuery } from '@work-orders/common/queries/create-paginated-query.js';

export const useCollectionsQuery = createPaginatedQuery({
  endpoint: '/api/collection',
  queryKeyFn: ({ query = '', first }: PaginationOptions) => ['collections', query, first],
  extractPage: (response: FetchCollectionsResponse) => response.collections,
  cursorParamName: 'after',
});
