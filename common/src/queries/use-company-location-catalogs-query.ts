import { createPaginatedQuery } from './create-paginated-query.js';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { PaginationOptions } from '@web/schemas/generated/pagination-options.js';
import { FetchCompanyLocationCatalogsResponse } from '@web/controllers/api/companies.js';

export const useCompanyLocationCatalogsQuery = (
  companyLocationId: ID,
  options: Parameters<
    ReturnType<
      typeof createPaginatedQuery<
        PaginationOptions,
        FetchCompanyLocationCatalogsResponse,
        FetchCompanyLocationCatalogsResponse['ids'][number]
      >
    >
  >[0],
) =>
  createPaginatedQuery({
    endpoint: `/api/companies/location/${encodeURIComponent(parseGid(companyLocationId).id)}/catalogs`,
    queryKeyFn: ({ query }: PaginationOptions) => ['company-location-catalogs', companyLocationId, query],
    extractPage: (response: FetchCompanyLocationCatalogsResponse) => response.ids,
    cursorParamName: 'after',
  })(options);
