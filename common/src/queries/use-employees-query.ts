import type { FetchEmployeesResponse } from '@web/controllers/api/employee.js';
import { createPaginatedQuery } from './create-paginated-query.js';
import { PaginationOptions } from '@web/schemas/generated/pagination-options.js';
import { toDollars } from '@web/util/money.js';

export const useEmployeesQuery = createPaginatedQuery({
  endpoint: '/api/employee',
  queryKeyFn: ({ query }: PaginationOptions) => ['employees', query],
  extractPage: (response: FetchEmployeesResponse) =>
    response.employees.map(employee => ({ ...employee, rate: employee.rate ? toDollars(employee.rate) : null })),
  cursorParamName: 'after',
});

export type Employee = {
  id: string;
  name: string;
  rate: number | null;
};
