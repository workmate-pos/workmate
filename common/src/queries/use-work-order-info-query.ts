import type { WorkOrderPaginationOptions } from '@web/schemas/generated/work-order-pagination-options.js';
import type { FetchWorkOrderInfoPageResponse } from '@web/controllers/api/work-order.js';
import { Fetch } from './fetch.js';
import { useInfiniteQuery, UseInfiniteQueryOptions } from 'react-query';
import { WorkOrderInfo } from '@web/services/work-orders/types.js';
import { ID } from '@web/schemas/generated/ids.js';

export const useWorkOrderInfoQuery = (
  {
    fetch,
    query,
    status,
    employeeIds,
    customerId,
    limit = 10,
  }: Omit<WorkOrderPaginationOptions, 'limit' | 'offset'> & { limit?: number; fetch: Fetch },
  options?: UseInfiniteQueryOptions<
    WorkOrderInfo[],
    unknown,
    WorkOrderInfo,
    WorkOrderInfo[],
    (
      | string
      | {
          query: string | undefined;
          status: string | undefined;
          limit: number;
          employeeIds: ID[] | undefined;
          customerId: ID | undefined;
        }
    )[]
  >,
) =>
  useInfiniteQuery({
    ...options,
    queryKey: ['work-order-info', { query, status, limit, employeeIds, customerId }],
    queryFn: async ({ pageParam: offset = 0 }) => {
      const searchParams = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });

      if (query) searchParams.set('query', query);
      if (status) searchParams.set('status', status);
      if (customerId) searchParams.set('customerId', customerId);

      for (const employeeId of employeeIds ?? []) {
        searchParams.append('employeeIds', employeeId);
      }

      const response = await fetch(`/api/work-order?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch work order info');
      }

      const result: FetchWorkOrderInfoPageResponse = await response.json();
      return result;
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length === 0) return undefined;
      return pages.flat(1).length;
    },
    select: ({ pages, pageParams }) => ({
      pages: pages.flat(1),
      pageParams,
    }),
  });
