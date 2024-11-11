import { SerialPaginationOptions } from '@web/schemas/generated/serial-pagination-options.js';
import { FetchSerialsResponse } from '@web/controllers/api/serials.js';
import { Fetch } from './fetch.js';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { UseQueryData } from './react-query.js';
import { useSerialQuery } from './use-serial-query.js';

export const useSerialsQuery = ({
  fetch,
  params,
  options,
}: {
  fetch: Fetch;
  params: Omit<SerialPaginationOptions, 'offset'>;
  options?: { enabled?: boolean };
}) => {
  const queryClient = useQueryClient();

  return useInfiniteQuery({
    ...options,
    queryKey: ['serials', params],
    queryFn: async ({ pageParam: offset }) => {
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

      for (const serial of serials) {
        queryClient.setQueryData<UseQueryData<typeof useSerialQuery>>(
          ['serial', serial.productVariant.id, serial.serial],
          serial,
        );
      }

      return { serials, hasNextPage };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      if (!lastPage.hasNextPage) return undefined;
      return pages.flat(1).length;
    },
    select: ({ pages, pageParams }) => ({
      pages: pages.map(page => page.serials),
      pageParams,
    }),
  });
};
