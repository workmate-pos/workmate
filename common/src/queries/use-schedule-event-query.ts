import { Fetch } from './fetch.js';
import { skipToken, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { GetScheduleEventResponse } from '@web/controllers/api/schedules.js';

export const useScheduleEventQuery = (
  {
    fetch,
    scheduleId,
    eventId,
  }: {
    fetch: Fetch;
    scheduleId: number | null;
    eventId: number | null;
  },
  options?: Partial<UseQueryOptions<DetailedScheduleEvent, Error, DetailedScheduleEvent, (string | number | null)[]>>,
) =>
  useQuery({
    ...options,
    queryKey: ['schedule', scheduleId, 'event', eventId],
    queryFn:
      scheduleId === null || eventId === null
        ? skipToken
        : async () => {
            const response = await fetch(
              `/api/schedules/${encodeURIComponent(scheduleId)}/events/${encodeURIComponent(eventId)}`,
            );

            if (!response.ok) {
              throw new Error('Failed to fetch employee schedule event');
            }

            const event: GetScheduleEventResponse = await response.json();
            return mapEvent(event);
          },
  });

export type DetailedScheduleEvent = ReturnType<typeof mapEvent>;

export function mapEvent(event: GetScheduleEventResponse) {
  return {
    ...event,
    start: new Date(event.start),
    end: new Date(event.end),
    createdAt: new Date(event.createdAt),
    updatedAt: new Date(event.updatedAt),
    assignedStaffMemberIds: event.assignedStaffMemberIds,
    taskIds: event.taskIds,
  };
}
