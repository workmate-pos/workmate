import type {
  PaymentStatus,
  WorkOrderPaginationOptions,
} from '@web/schemas/generated/work-order-pagination-options.js';
import type { FetchWorkOrderInfoPageResponse } from '@web/controllers/api/work-order.js';
import { Fetch } from './fetch.js';
import { useInfiniteQuery, UseInfiniteQueryOptions } from 'react-query';
import { WorkOrderInfo } from '@web/services/work-orders/types.js';
import { ID } from '@web/schemas/generated/ids.js';
import { CustomFieldFilter } from '@web/services/custom-field-filters.js';

export type OverdueStatus = 'OVERDUE' | 'NOT_OVERDUE';

export const useWorkOrderInfoQuery = (
  {
    fetch,
    query,
    status,
    employeeIds,
    customerId,
    customFieldFilters,
    paymentStatus,
    overdueStatus,
    limit = 10,
  }: Omit<WorkOrderPaginationOptions, 'limit' | 'offset' | 'customFieldFilters' | 'afterDueDate' | 'beforeDueDate'> & {
    limit?: number;
    fetch: Fetch;
    customFieldFilters: CustomFieldFilter[];
    overdueStatus?: OverdueStatus;
  },
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
          customFieldFilters: CustomFieldFilter[];
          paymentStatus: PaymentStatus | undefined;
          overdueStatus: OverdueStatus | undefined;
        }
    )[]
  >,
) =>
  useInfiniteQuery({
    ...options,
    queryKey: [
      'work-order-info',
      { query, status, limit, employeeIds, customerId, customFieldFilters, paymentStatus, overdueStatus },
    ],
    queryFn: async ({ pageParam: offset = 0 }) => {
      const searchParams = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });

      if (query) searchParams.set('query', query);
      if (status) searchParams.set('status', status);
      if (customerId) searchParams.set('customerId', customerId);
      if (paymentStatus) searchParams.set('paymentStatus', paymentStatus);

      const now = new Date();
      if (overdueStatus === 'OVERDUE') {
        const beforeDueDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0));
        searchParams.set('beforeDueDate', beforeDueDate.toISOString());
      } else if (overdueStatus === 'NOT_OVERDUE') {
        const afterDueDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59));
        searchParams.set('afterDueDate', afterDueDate.toISOString());
      }

      for (const filter of customFieldFilters) {
        searchParams.append('customFieldFilters', JSON.stringify(filter));
      }

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
