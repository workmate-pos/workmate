import type { FetchCollectionsResponse } from '../../controllers/api/collection';
import type { PaginationOptions } from '../../schemas/generated/pagination-options';
import { createPaginatedQuery } from './create-paginated-query';

export const useCollectionsQuery = createPaginatedQuery<PaginationOptions, FetchCollectionsResponse>({
  endpoint: '/api/collection',
  pagePropertyName: 'collections',
  queryKeyFn: ({ query = '', first }) => ['collections', query, first],
  cursorParamName: 'after',
});
