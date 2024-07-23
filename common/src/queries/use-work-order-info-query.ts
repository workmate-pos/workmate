import type {
  PaymentStatus,
  PurchaseOrderStatus,
  WorkOrderPaginationOptions,
} from '@web/schemas/generated/work-order-pagination-options.js';
import type { FetchWorkOrderInfoPageResponse } from '@web/controllers/api/work-order.js';
import { Fetch } from './fetch.js';
import { useInfiniteQuery, UseInfiniteQueryOptions, useQueryClient } from 'react-query';
import { WorkOrderInfo } from '@web/services/work-orders/types.js';
import { ID } from '@web/schemas/generated/ids.js';
import { CustomFieldFilter } from '@web/services/custom-field-filters.js';
import { UseQueryData } from './react-query.js';
import { useWorkOrderQuery } from './use-work-order-query.js';

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
    purchaseOrderStatus,
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
    WorkOrderInfo[],
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
          purchaseOrderStatus: PurchaseOrderStatus | undefined;
        }
    )[]
  >,
) => {
  const queryClient = useQueryClient();

  return useInfiniteQuery({
    ...options,
    queryKey: [
      'work-order-info',
      {
        query,
        status,
        limit,
        employeeIds,
        customerId,
        customFieldFilters,
        paymentStatus,
        overdueStatus,
        purchaseOrderStatus,
      },
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
      if (purchaseOrderStatus) searchParams.set('purchaseOrderStatus', purchaseOrderStatus);

      const now = new Date();
      if (overdueStatus === 'OVERDUE') {
        const beforeDueDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
        searchParams.set('beforeDueDate', beforeDueDate.toISOString());
        searchParams.set('excludePaymentStatus', 'true');
        searchParams.set('paymentStatus', 'FULLY_PAID' satisfies PaymentStatus);
      } else if (overdueStatus === 'NOT_OVERDUE') {
        const afterDueDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
        searchParams.set('afterDueDate', afterDueDate.toISOString());
        searchParams.set('excludePaymentStatus', 'true');
        searchParams.set('paymentStatus', 'FULLY_PAID' satisfies PaymentStatus);
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
      pages: pages.filter(page => page.length > 0),
      pageParams,
    }),
  });
};
