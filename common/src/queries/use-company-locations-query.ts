import { createPaginatedQuery } from './create-paginated-query.js';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { PaginationOptions } from '@web/schemas/generated/pagination-options.js';
import { FetchCompanyLocationsResponse } from '@web/controllers/api/companies.js';
import { useQueryClient } from '@tanstack/react-query';
import { UseQueryData } from './react-query.js';
import { useCompanyLocationQuery } from './use-company-location-query.js';

export const useCompanyLocationsQuery = (
  id: ID,
  options: Parameters<
    ReturnType<
      typeof createPaginatedQuery<
        PaginationOptions,
        FetchCompanyLocationsResponse,
        FetchCompanyLocationsResponse['locations'][number]
      >
    >
  >[0],
) => {
  const queryClient = useQueryClient();

  const query = createPaginatedQuery({
    endpoint: `/api/companies/${encodeURIComponent(parseGid(id).id)}/locations`,
    queryKeyFn: ({ query }: PaginationOptions) => ['company-locations', id, query],
    extractPage: (response: FetchCompanyLocationsResponse) => response.locations,
    cursorParamName: 'after',
  });

  return query({
    ...options,
    options: {
      ...options.options,
      onSuccess: page => {
        for (const location of page.locations) {
          queryClient.setQueryData(
            ['company-location', location.id],
            location satisfies UseQueryData<typeof useCompanyLocationQuery>,
          );
        }

        options.options?.onSuccess?.(page);
      },
    },
  });
};

export type CompanyLocation = FetchCompanyLocationsResponse['locations'][number];
