import type { FetchEmployeesResponse } from '@web/controllers/api/employee.js';
import type { PaginationOptions } from '@web/schemas/generated/pagination-options.js';
import { createPaginatedQuery } from './create-paginated-query.js';
import { useQueryClient } from 'react-query';
import { UseQueryData } from './react-query.js';
import { useEmployeeQuery } from './use-employee-query.js';

const query = createPaginatedQuery({
  endpoint: '/api/employee',
  queryKeyFn: ({ query }: PaginationOptions) => ['employees', query],
  extractPage: (response: FetchEmployeesResponse): Employee[] => response.employees,
  cursorParamName: 'after',
});

export const useEmployeesQuery = (...[options, ...args]: Parameters<typeof query>) => {
  const queryClient = useQueryClient();

  return query(
    {
      ...options,
      options: {
        ...options.options,
        onSuccess: data => {
          for (const employee of data.pages.flat()) {
            queryClient.setQueryData(
              ['employee', employee.id],
              employee satisfies UseQueryData<typeof useEmployeeQuery>,
            );
          }

          options.options?.onSuccess?.(data);
        },
      },
    },
    ...args,
  );
};

export type Employee = FetchEmployeesResponse['employees'][number];
