import { createPaginatedQuery } from './create-paginated-query.js';
import { Int, PaginationOptions } from '@web/schemas/generated/pagination-options.js';
import { FetchLabourResponse } from '@web/controllers/api/labour.js';
import { Fetch } from './fetch.js';
import { DefaultError, MutationOptions, queryOptions, useQueryClient } from '@tanstack/react-query';
import { UseQueryData } from './react-query.js';
import { useLabourQuery } from './use-labour-query.js';

export const useLaboursQuery = ({ fetch, type, first }: { fetch: Fetch; type: 'hourly' | 'fixed'; first?: Int }) => {
  const queryClient = useQueryClient();

  return createPaginatedQuery({
    endpoint: `/api/labour/page/${type}`,
    queryKeyFn: ({ query }: PaginationOptions) => ['labours', type, query],
    extractPage: (response: FetchLabourResponse) => response.labour,
    cursorParamName: 'after',
  })({
    fetch,
    params: { first },
    options: {
      onSuccess: page => {
        for (const labour of page.labour) {
          queryClient.setQueryData(['labour', labour.id], labour satisfies UseQueryData<typeof useLabourQuery>);
        }
      },
    },
  });
};
