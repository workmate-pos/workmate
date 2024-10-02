import { Fetch } from './fetch.js';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { GetSchedulesResponse } from '@web/controllers/api/schedules.js';
import { SchedulesPaginationOptions } from '@web/schemas/generated/schedules-pagination-options.js';
import { Schedule } from '@web/services/schedules/queries.js';
import { mapSchedule, useScheduleQuery } from './use-schedule-query.js';
import { UseQueryData } from './react-query.js';

export const useSchedulesQuery = ({
  fetch,
  filters,
}: {
  fetch: Fetch;
  filters: Omit<SchedulesPaginationOptions, 'offset'>;
}) => {
  const queryClient = useQueryClient();

  return useInfiniteQuery({
    queryKey: ['schedule', 'list', filters],
    queryFn: async ({ pageParam: offset }) => {
      const { query, locationId, limit } = filters;
      const searchParams = new URLSearchParams();

      if (query) searchParams.set('query', query);
      searchParams.set('offset', String(offset));
      if (locationId) searchParams.set('locationId', locationId);
      if (limit) searchParams.set('limit', String(limit));

      const response = await fetch(`/api/schedules/?${searchParams.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch employee schedules');
      }

      const result: GetSchedulesResponse = await response.json();

      for (const schedule of result.schedules) {
        queryClient.setQueryData<UseQueryData<typeof useScheduleQuery>>(
          ['schedule', schedule.id],
          mapSchedule(schedule),
        );
      }

      return result;
    },
    initialPageParam: 0,
    getNextPageParam: (page, allPages) =>
      page.hasNextPage ? allPages.flatMap(page => page.schedules).length : undefined,
    select: data => ({
      pages: data.pages.map(page => page.schedules.map<Schedule>(schedule => mapSchedule(schedule))),
    }),
  });
};
