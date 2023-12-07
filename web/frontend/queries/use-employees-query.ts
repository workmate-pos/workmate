import type { FetchEmployeesResponse } from '../../controllers/api/employee';
import type { PaginationOptions } from '../../schemas/generated/pagination-options';
import { createPaginatedQuery } from './create-paginated-query';

export const useEmployeesQuery = createPaginatedQuery<PaginationOptions, FetchEmployeesResponse>({
  endpoint: '/api/employee',
  queryKeyFn: ({ query = '', first }) => ['employees', query, first],
  pagePropertyName: 'employees',
  cursorParamName: 'after',
});
