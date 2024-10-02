import { Fetch } from './fetch.js';
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  GetScheduleEventResponse,
  GetScheduleEventsResponse,
  GetScheduleEventTasksResponse,
  GetScheduleResponse,
} from '@web/controllers/api/schedules.js';
import { ScheduleEventsOptions } from '@web/schemas/generated/schedule-events-options.js';
import { UseQueryData } from './react-query.js';
import { mapTask, useTaskQuery } from './use-task-query.js';

export const useScheduleEventTasksQuery = ({
  fetch,
  scheduleId,
  itemId,
}: {
  fetch: Fetch;
  scheduleId: number | null;
  itemId: number | null;
}) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['schedule', scheduleId, 'item', itemId, 'tasks'],
    queryFn:
      scheduleId === null || itemId === null
        ? skipToken
        : async () => {
            const response = await fetch(
              `/api/schedules/${encodeURIComponent(scheduleId)}/items/${encodeURIComponent(itemId)}/tasks`,
            );

            if (!response.ok) {
              throw new Error('Failed to fetch employee schedule item');
            }

            const tasks: GetScheduleEventTasksResponse = await response.json();

            for (const task of tasks) {
              queryClient.setQueryData<UseQueryData<typeof useTaskQuery>>(['task', task.id], mapTask(task));
            }

            return tasks;
          },
  });
};
