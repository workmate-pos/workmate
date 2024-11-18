import { SpecialOrderPaginationOptions } from '@web/schemas/generated/special-order-pagination-options.js';
import { FetchSpecialOrdersResponse } from '@web/controllers/api/special-orders.js';
import { Fetch } from './fetch.js';
import { useInfiniteQuery, UseInfiniteQueryOptions } from '@tanstack/react-query';

export const useSpecialOrdersQuery = ({
  fetch,
  params,
  options,
}: {
  fetch: Fetch;
  params: Omit<SpecialOrderPaginationOptions, 'offset'>;
  options?: { enabled?: boolean };
}) =>
  useInfiniteQuery({
    ...options,
    queryKey: ['special-orders', params],
    queryFn: async ({ pageParam: offset }) => {
      const searchParams = new URLSearchParams();

      for (const [key, value] of Object.entries({ ...params, offset })) {
        if (value === undefined) continue;

        if (Array.isArray(value)) {
          for (const x of value) {
            searchParams.append(key, String(x));
          }
        } else {
          searchParams.set(key, String(value));
        }
      }

      const response = await fetch(`/api/special-orders?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch special orders');
      }

      const { specialOrders, hasNextPage }: FetchSpecialOrdersResponse = await response.json();
      return { specialOrders, hasNextPage };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      if (!lastPage.hasNextPage) return undefined;
      return pages.flatMap(page => page.specialOrders).length;
    },
    select: ({ pages, pageParams }) => ({
      pages: pages.map(page => page.specialOrders),
      pageParams,
    }),
  });
