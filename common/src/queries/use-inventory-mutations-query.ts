import { useInfiniteQuery } from '@tanstack/react-query';
import { Fetch } from './fetch.js';
import { InventoryPaginationOptions } from '@web/schemas/generated/inventory-pagination-options.js';
import { FetchInventoryMutationsResponse } from '@web/controllers/api/inventory.js';
import { NestedDateTimeToDate } from '../types/NestedDateTimeToDate.js';

export const useInventoryMutationsQuery = ({
  fetch,
  options = {},
}: {
  fetch: Fetch;
  options?: Omit<InventoryPaginationOptions, 'offset'>;
}) =>
  useInfiniteQuery({
    queryKey: ['inventory-mutations', options],
    queryFn: async ({ pageParam: offset }): Promise<NestedDateTimeToDate<FetchInventoryMutationsResponse>> => {
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
      return {
        ...result,
        mutations: result.mutations.map(({ createdAt, updatedAt, ...mutation }) => ({
          ...mutation,
          createdAt: new Date(createdAt),
          updatedAt: new Date(updatedAt),
          items: mutation.items.map(({ createdAt, updatedAt, ...item }) => ({
            ...item,
            createdAt: new Date(createdAt),
            updatedAt: new Date(updatedAt),
          })),
        })),
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages, previousOffset) =>
      lastPage.hasNextPage ? previousOffset + lastPage.mutations.length : undefined,
  });
