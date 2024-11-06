import { useInfiniteQuery } from '@tanstack/react-query';
import { Fetch } from './fetch.js';
import { InventoryPaginationOptions } from '@web/schemas/generated/inventory-pagination-options.js';
import { FetchInventoryMutationsResponse } from '@web/controllers/api/inventory.js';

export const useInventoryMutationsQuery = ({
  fetch,
  options = {},
}: {
  fetch: Fetch;
  options?: Omit<InventoryPaginationOptions, 'offset'>;
}) =>
  useInfiniteQuery({
    queryKey: ['inventory-mutations', options],
    queryFn: async ({ pageParam: offset }) => {
      const searchParams = new URLSearchParams(
        Object.entries(options)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)]),
      );

      searchParams.set('offset', String(offset));

      const response = await fetch(`/api/inventory/mutations?${searchParams.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch inventory mutations');
      }

      const result: FetchInventoryMutationsResponse = await response.json();
      return result;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages, previousOffset) =>
      lastPage.hasNextPage ? previousOffset + lastPage.mutations.length : undefined,
  });
