import { SerialPaginationOptions } from '@web/schemas/generated/serial-pagination-options.js';
import { FetchSerialsResponse } from '@web/controllers/api/serials.js';
import { Fetch } from './fetch.js';
import { useInfiniteQuery, UseInfiniteQueryOptions } from 'react-query';

export const useSerialsQuery = ({
  fetch,
  params,
  options,
}: {
  fetch: Fetch;
  params: Omit<SerialPaginationOptions, 'offset'>;
  options?: { enabled?: boolean };
}) =>
  useInfiniteQuery({
    ...options,
    queryKey: ['serials', params],
    queryFn: async ({ pageParam: offset = 0 }) => {
      const searchParams = new URLSearchParams();

      for (const [key, value] of Object.entries({ ...params, offset })) {
        if (value === undefined) continue;
        searchParams.set(key, String(value));
      }

      const response = await fetch(`/api/serials?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch special orders');
      }

      const { serials, hasNextPage }: FetchSerialsResponse = await response.json();
      return { serials, hasNextPage };
    },
    getNextPageParam: (lastPage, pages) => {
      if (!lastPage.hasNextPage) return undefined;
      return pages.flat(1).length;
    },
    select: ({ pages, pageParams }) => ({
      pages: pages.map(page => page.serials),
      pageParams,
    }),
  });
