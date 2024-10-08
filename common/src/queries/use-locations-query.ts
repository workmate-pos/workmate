import type { FetchLocationsResponse } from '@web/controllers/api/locations.js';
import type { PaginationOptions } from '@web/schemas/generated/pagination-options.js';
import { createPaginatedQuery } from './create-paginated-query.js';
import { useQueryClient } from '@tanstack/react-query';
import { UseQueryData } from './react-query.js';
import { useLocationQuery } from './use-location-query.js';

const query = createPaginatedQuery({
  endpoint: '/api/locations',
  queryKeyFn: (options: PaginationOptions) => ['locations', options],
  extractPage: (response: FetchLocationsResponse) => response.locations,
  cursorParamName: 'after',
});

export const useLocationsQuery = (...[options, ...args]: Parameters<typeof query>) => {
  const queryClient = useQueryClient();

  return query(
    {
      ...options,
      options: {
        ...options.options,
        onSuccess: page => {
          for (const location of page.locations) {
            queryClient.setQueryData(
              ['location', location.id],
              location satisfies UseQueryData<typeof useLocationQuery>,
            );
          }
        },
      },
    },
    ...args,
  );
};

export type Location = FetchLocationsResponse['locations'][number];
