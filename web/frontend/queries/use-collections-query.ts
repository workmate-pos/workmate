import type { FetchCollectionsResponse } from '../../controllers/api/collection';
import type { PaginationOptions } from '../../schemas/generated/pagination-options';
import { createPaginatedQuery } from '@common/queries/create-paginated-query';

export const useCollectionsQuery = createPaginatedQuery({
  endpoint: '/api/collection',
  queryKeyFn: ({ query = '', first }: PaginationOptions) => ['collections', query, first],
  extractPage: (response: FetchCollectionsResponse) => response.collections,
  cursorParamName: 'after',
});
