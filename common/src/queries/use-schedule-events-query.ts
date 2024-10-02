import { Fetch } from './fetch.js';
import { QueryClient, skipToken, useQueries, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { GetScheduleEventsResponse } from '@web/controllers/api/schedules.js';
import { ScheduleEventsOptions } from '@web/schemas/generated/schedule-events-options.js';
import { DetailedScheduleEvent, mapEvent, useScheduleEventQuery } from './use-schedule-event-query.js';
import { UseQueryData } from './react-query.js';
import { DateTime } from '@web/services/gql/queries/generated/schema.js';

export const useScheduleEventsQuery = (
  {
    fetch,
    id,
    filters,
  }: {
    fetch: Fetch;
    id: number | 'all' | null;
    filters: ScheduleEventsFilters;
  },
  options?: Partial<
    UseQueryOptions<
      DetailedScheduleEvent[],
      Error,
      DetailedScheduleEvent[],
      (string | number | ScheduleEventsFilters | null)[]
    >
  >,
) => {
  const queryClient = useQueryClient();
  return useQuery({
    ...options,
    queryKey: ['schedule', id, 'event', 'list', filters],
    queryFn: id === null ? skipToken : () => queryFn({ fetch, queryClient, filters, id }),
  });
};

export const useScheduleEventQueries = ({
  fetch,
  options,
}: {
  fetch: Fetch;
  options: {
    id: number | 'all';
    filters: ScheduleEventsFilters;
  }[];
}) => {
  const queryClient = useQueryClient();

  return useQueries({
    queries: options.map(({ id, filters }) => ({
      queryKey: ['schedule', id, 'event', 'list', filters],
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
  filters: ScheduleEventsFilters;
  id: number | 'all';
}) {
  const { from, to, staffMemberId, published, taskId } = mapFilters(filters);
  const searchParams = new URLSearchParams({ from, to });

  if (published !== undefined) searchParams.set('published', String(published));
  if (staffMemberId) searchParams.set('staffMemberId', staffMemberId);
  if (taskId) searchParams.set('taskId', String(taskId));

  const response = await fetch(`/api/schedules/${encodeURIComponent(id)}/events?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch employee schedule events');
  }

  const events: GetScheduleEventsResponse = await response.json();

  for (const event of events) {
    queryClient.setQueryData<UseQueryData<typeof useScheduleEventQuery>>(
      ['schedule', id, 'event', event.id],
      mapEvent(event),
    );
  }

  return events.map(mapEvent);
}

export type ScheduleEventsFilters = Omit<ScheduleEventsOptions, 'from' | 'to'> & { from: Date; to: Date };

function mapFilters(filters: ScheduleEventsFilters): ScheduleEventsOptions {
  return {
    ...filters,
    from: filters.from.toISOString() as DateTime,
    to: filters.to.toISOString() as DateTime,
  };
}
