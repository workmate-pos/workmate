import { Fetch } from './fetch.js';
import { InventoryMutationItemsPaginationOptions } from '@web/schemas/generated/inventory-mutation-items-pagination-options.js';
import { useInfiniteQuery } from '@tanstack/react-query';
import { NestedDateTimeToDate } from '../types/NestedDateTimeToDate.js';
import { FetchInventoryMutationItemsResponse } from '@web/controllers/api/inventory.js';

export const useInventoryMutationItemsQuery = ({
  fetch,
  options = {},
}: {
  fetch: Fetch;
  options?: Omit<InventoryMutationItemsPaginationOptions, 'offset'>;
}) =>
  useInfiniteQuery({
    queryKey: ['inventory-mutation-items', options],
    queryFn: async ({ pageParam: offset }): Promise<NestedDateTimeToDate<FetchInventoryMutationItemsResponse>> => {
      const searchParams = new URLSearchParams(
        Object.entries(options)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)]),
      );

      searchParams.set('offset', String(offset));

      const response = await fetch(`/api/inventory/mutation-items?${searchParams.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch inventory mutation items');
      }

      const result: FetchInventoryMutationItemsResponse = await response.json();
      return {
        ...result,
        items: result.items.map(({ createdAt, updatedAt, ...item }) => ({
          ...item,
          createdAt: new Date(createdAt),
          updatedAt: new Date(updatedAt),
        })),
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      if (!lastPage.hasNextPage) return undefined;
      return lastPage.items.length;
    },
  });
