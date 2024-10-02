import { Fetch } from './fetch.js';
import { skipToken, useQuery } from '@tanstack/react-query';
import { ScheduleResponse, GetScheduleResponse } from '@web/controllers/api/schedules.js';
import { Schedule } from '@web/services/schedules/queries.js';

export const useScheduleQuery = ({ fetch, id }: { fetch: Fetch; id: number | null }) =>
  useQuery({
    queryKey: ['schedule', id],
    queryFn:
      id === null
        ? skipToken
        : async () => {
            const response = await fetch(`/api/schedules/${encodeURIComponent(id)}`);

            if (!response.ok) {
              throw new Error('Failed to fetch employee schedule');
            }

            const schedule: GetScheduleResponse = await response.json();
            return mapSchedule(schedule);
          },
  });

export function mapSchedule(schedule: ScheduleResponse): Schedule {
  return {
    ...schedule,
    createdAt: new Date(schedule.createdAt),
    updatedAt: new Date(schedule.updatedAt),
    publishedAt: schedule.publishedAt ? new Date(schedule.publishedAt) : null,
  };
}
