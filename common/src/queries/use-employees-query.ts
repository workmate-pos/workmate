import type { FetchEmployeesResponse } from '@web/controllers/api/employee.js';
import { createPaginatedQuery } from './create-paginated-query.js';
import { useQueryClient } from '@tanstack/react-query';
import { UseQueryData } from './react-query.js';
import { useEmployeeQuery } from './use-employee-query.js';
import { StaffMemberPaginationOptions } from '@web/schemas/generated/staff-member-pagination-options.js';

const query = createPaginatedQuery({
  endpoint: '/api/employee',
  queryKeyFn: (options: StaffMemberPaginationOptions) => ['employees', options],
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
        onSuccess: page => {
          for (const employee of page.employees) {
            queryClient.setQueryData(
              ['employee', employee.id],
              employee satisfies UseQueryData<typeof useEmployeeQuery>,
            );
          }

          options.options?.onSuccess?.(page);
        },
      },
    },
    ...args,
  );
};

export type Employee = FetchEmployeesResponse['employees'][number];
