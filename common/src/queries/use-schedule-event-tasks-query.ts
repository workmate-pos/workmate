import { Fetch } from './fetch.js';
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { GetScheduleEventTasksResponse } from '@web/controllers/api/schedules.js';
import { UseQueryData } from './react-query.js';
import { mapTask, useTaskQuery } from './use-task-query.js';

export const useScheduleEventTasksQuery = ({
  fetch,
  scheduleId,
  eventId,
}: {
  fetch: Fetch;
  scheduleId: number | null;
  eventId: number | null;
}) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['schedule', scheduleId, 'event', eventId, 'tasks'],
    queryFn:
      scheduleId === null || eventId === null
        ? skipToken
        : async () => {
            const response = await fetch(
              `/api/schedules/${encodeURIComponent(scheduleId)}/events/${encodeURIComponent(eventId)}/tasks`,
            );

            if (!response.ok) {
              throw new Error('Failed to fetch employee schedule event');
            }

            const tasks: GetScheduleEventTasksResponse = await response.json();

            for (const task of tasks) {
              queryClient.setQueryData<UseQueryData<typeof useTaskQuery>>(['task', task.id], mapTask(task));
            }

            return tasks.map(mapTask);
          },
  });
};
