import type { FetchEmployeesResponse } from '../../controllers/api/employee';
import type { PaginationOptions } from '../../schemas/generated/pagination-options';
import { createPaginatedQuery } from '@common/queries/create-paginated-query';

export const useEmployeesQuery = createPaginatedQuery({
  endpoint: '/api/employee',
  queryKeyFn: ({ query = '', first }: PaginationOptions) => ['employees', query, first],
  extractPage: (response: FetchEmployeesResponse) => response.employees,
  cursorParamName: 'after',
});
