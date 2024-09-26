import { Fetch } from './fetch.js';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { GetSchedulesResponse } from '@web/controllers/api/schedules.js';
import { SchedulesPaginationOptions } from '@web/schemas/generated/schedules-pagination-options.js';
import { EmployeeSchedule } from '@web/services/schedules/queries.js';
import { mapSchedule, useEmployeeScheduleQuery } from './use-employee-schedule-query.js';
import { UseQueryData } from './react-query.js';

export const useEmployeeSchedulesQuery = ({
  fetch,
  filters,
}: {
  fetch: Fetch;
  filters: Omit<SchedulesPaginationOptions, 'offset'>;
}) => {
  const queryClient = useQueryClient();

  return useInfiniteQuery({
    queryKey: ['employee-schedule', 'list', filters],
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
        queryClient.setQueryData<UseQueryData<typeof useEmployeeScheduleQuery>>(
          ['employee-schedule', schedule.id],
          mapSchedule(schedule),
        );
      }

      return result;
    },
    initialPageParam: 0,
    getNextPageParam: (page, allPages) =>
      page.hasNextPage ? allPages.flatMap(page => page.schedules).length : undefined,
    select: data => ({
      pages: data.pages.map(page => page.schedules.map<EmployeeSchedule>(schedule => mapSchedule(schedule))),
    }),
  });
};
