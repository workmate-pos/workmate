import type { FetchCustomersResponse } from '@web/controllers/api/customer.js';
import type { PaginationOptions } from '@web/schemas/generated/pagination-options.js';
import { createPaginatedQuery } from './create-paginated-query.js';
import { useQueryClient } from '@tanstack/react-query';
import { useCustomerQuery } from './use-customer-query.js';
import { UseQueryData } from './react-query.js';

const query = createPaginatedQuery({
  endpoint: '/api/customer',
  queryKeyFn: ({ query }: PaginationOptions) => ['customers', query],
  extractPage: (response: FetchCustomersResponse) => response.customers,
  cursorParamName: 'after',
});

export const useCustomersQuery = (...[options, ...args]: Parameters<typeof query>) => {
  const queryClient = useQueryClient();

  return query(
    {
      ...options,
      options: {
        ...options.options,
        onSuccess: page => {
          for (const customer of page.customers) {
            queryClient.setQueryData(
              ['customer', customer.id],
              customer satisfies UseQueryData<typeof useCustomerQuery>,
            );
          }

          options.options?.onSuccess?.(page);
        },
      },
    },
    ...args,
  );
};

export type Customer = FetchCustomersResponse['customers'][number];
