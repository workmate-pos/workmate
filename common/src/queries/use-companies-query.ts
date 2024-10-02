import type { FetchCompaniesResponse } from '@web/controllers/api/companies.js';
import type { PaginationOptions } from '@web/schemas/generated/pagination-options.js';
import { createPaginatedQuery } from './create-paginated-query.js';
import { useQueryClient } from '@tanstack/react-query';
import { useCompanyQuery } from './use-company-query.js';
import { UseQueryData } from './react-query.js';

const query = createPaginatedQuery({
  endpoint: '/api/companies',
  queryKeyFn: ({ query }: PaginationOptions) => ['companies', query],
  extractPage: (response: FetchCompaniesResponse) => response.companies,
  cursorParamName: 'after',
});

export const useCompaniesQuery = (...[options, ...args]: Parameters<typeof query>) => {
  const queryClient = useQueryClient();

  return query(
    {
      ...options,
      options: {
        ...options.options,
        onSuccess: page => {
          for (const company of page.companies) {
            queryClient.setQueryData(['company', company.id], company satisfies UseQueryData<typeof useCompanyQuery>);
          }
        },
      },
    },
    ...args,
  );
};

export type Company = FetchCompaniesResponse['companies'][number];
