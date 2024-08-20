import { useInfiniteQuery, useQueryClient } from 'react-query';
import { Fetch } from './fetch.js';
import { CycleCountPaginationOptions } from '@web/schemas/generated/cycle-count-pagination-options.js';
import { pick } from '@teifi-digital/shopify-app-toolbox/object';
import { FetchCycleCountsResponse } from '@web/controllers/api/cycle-count.js';
import { useCycleCountQuery } from './use-cycle-count-query.js';
import { UseQueryData } from './react-query.js';

const PAGE_SIZE = 25 as const;

export const useCycleCountPageQuery = ({
  fetch,
  filters,
}: {
  fetch: Fetch;
  filters: Omit<CycleCountPaginationOptions, 'offset' | 'limit'>;
}) => {
  const queryClient = useQueryClient();

  return useInfiniteQuery({
    queryKey: ['cycle-count-page', filters],
    queryFn: async ({ pageParam: offset = 0 }) => {
      const searchParams = new URLSearchParams({
        offset: String(offset),
        limit: String(PAGE_SIZE),
      });

      for (const [key, value] of Object.entries(pick(filters, 'status', 'locationId', 'query'))) {
        if (!!value) {
          searchParams.set(key, String(value));
        }
      }

      const response = await fetch(`/api/cycle-count?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch cycle count');
      }

      const result: FetchCycleCountsResponse = await response.json();

      for (const cycleCount of result) {
        queryClient.setQueryData(
          ['cycle-count', cycleCount.name],
          cycleCount satisfies UseQueryData<typeof useCycleCountQuery>,
        );
      }

      return result;
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return pages.flat(1).length;
    },
    select: ({ pages, pageParams }) => ({
      pages: pages.filter(page => page.length > 0),
      pageParams,
    }),
  });
};
