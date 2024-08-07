import { Fetch } from './fetch.js';
import { Int, PaginationOptions } from '@web/schemas/generated/pagination-options.js';
import { createPaginatedQuery } from './create-paginated-query.js';
import { FetchServicesResponse } from '@web/controllers/api/services.js';

export const useServicesQuery = ({ fetch, first }: { fetch: Fetch; first?: Int }) =>
  createPaginatedQuery({
    endpoint: '/api/services',
    queryKeyFn: ({ query }: PaginationOptions) => ['services', query],
    extractPage: (response: FetchServicesResponse) => response.services,
    cursorParamName: 'after',
  })({ fetch, params: { first } });
