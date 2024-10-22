import { Fetch } from './fetch.js';
import { skipToken, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScheduleResponse, GetScheduleResponse } from '@web/controllers/api/schedules.js';
import { Schedule } from '@web/services/schedules/queries.js';

export const useScheduleQuery = ({ fetch, id }: { fetch: Fetch; id: number | null }) =>
  useQuery({
    queryKey: ['schedule', id],
    queryFn: id === null ? skipToken : getQueryFn(fetch, id),
  });

export function mapSchedule(schedule: ScheduleResponse): Schedule {
  return {
    ...schedule,
    createdAt: new Date(schedule.createdAt),
    updatedAt: new Date(schedule.updatedAt),
    publishedAt: schedule.publishedAt ? new Date(schedule.publishedAt) : null,
  };
}

function getQueryFn(fetch: Fetch, id: number) {
  return async () => {
    const response = await fetch(`/api/schedules/${encodeURIComponent(id)}`);

    if (!response.ok) {
      throw new Error('Failed to fetch employee schedule');
    }

    const schedule: GetScheduleResponse = await response.json();
    return mapSchedule(schedule);
  };
}

export const useScheduleQueries = ({ fetch, ids }: { fetch: Fetch; ids: number[] }) => {
  return useQueries({
    queries: ids.map(id => ({
      queryKey: ['schedule', id],
      queryFn: getQueryFn(fetch, id),
    })),
    combine: results => ({
      isPending: results.some(result => result.isPending),
      isLoading: results.some(result => result.isLoading),
      data: Object.fromEntries(results.map((result, i) => [ids[i]!, result.data] as const)),
    }),
  });
};
