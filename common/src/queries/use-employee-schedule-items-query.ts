import { Fetch } from './fetch.js';
import { QueryClient, skipToken, useQueries, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { GetScheduleItemsResponse } from '@web/controllers/api/schedules.js';
import { ScheduleItemsOptions } from '@web/schemas/generated/schedule-items-options.js';
import {
  DetailedEmployeeScheduleItem,
  mapItem,
  useEmployeeScheduleItemQuery,
} from './use-employee-schedule-item-query.js';
import { UseQueryData } from './react-query.js';
import { DateTime } from '@web/services/gql/queries/generated/schema.js';

export const useEmployeeScheduleItemsQuery = (
  {
    fetch,
    id,
    filters,
  }: {
    fetch: Fetch;
    id: number | 'all' | null;
    filters: EmployeeScheduleItemsFilters;
  },
  options?: Partial<
    UseQueryOptions<
      DetailedEmployeeScheduleItem[],
      Error,
      DetailedEmployeeScheduleItem[],
      (string | number | EmployeeScheduleItemsFilters | null)[]
    >
  >,
) => {
  const queryClient = useQueryClient();
  return useQuery({
    ...options,
    queryKey: ['employee-schedule', id, 'item', 'list', filters],
    queryFn: id === null ? skipToken : () => queryFn({ fetch, queryClient, filters, id }),
  });
};

export const useEmployeeScheduleItemQueries = ({
  fetch,
  options,
}: {
  fetch: Fetch;
  options: {
    id: number | 'all';
    filters: EmployeeScheduleItemsFilters;
  }[];
}) => {
  const queryClient = useQueryClient();

  return useQueries({
    queries: options.map(({ id, filters }) => ({
      queryKey: ['employee-schedule', id, 'item', 'list', filters],
      queryFn: () => queryFn({ fetch, queryClient, filters, id }),
    })),
  });
};

async function queryFn({
  fetch,
  queryClient,
  filters,
  id,
}: {
  fetch: Fetch;
  queryClient: QueryClient;
  filters: EmployeeScheduleItemsFilters;
  id: number | 'all';
}) {
  const { from, to, staffMemberId, published, taskId } = mapFilters(filters);
  const searchParams = new URLSearchParams({ from, to });

  if (published !== undefined) searchParams.set('published', String(published));
  if (staffMemberId) searchParams.set('staffMemberId', staffMemberId);
  if (taskId) searchParams.set('taskId', String(taskId));

  const response = await fetch(`/api/schedules/${encodeURIComponent(id)}/items?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch employee schedule items');
  }

  const items: GetScheduleItemsResponse = await response.json();

  for (const item of items.items) {
    queryClient.setQueryData<UseQueryData<typeof useEmployeeScheduleItemQuery>>(
      ['employee-schedule', id, 'item', item.id],
      mapItem(item),
    );
  }

  return items.items.map(mapItem);
}

export type EmployeeScheduleItemsFilters = Omit<ScheduleItemsOptions, 'from' | 'to'> & { from: Date; to: Date };

function mapFilters(filters: EmployeeScheduleItemsFilters): ScheduleItemsOptions {
  return {
    ...filters,
    from: filters.from.toISOString() as DateTime,
    to: filters.to.toISOString() as DateTime,
  };
}
