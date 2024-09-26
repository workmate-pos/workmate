import { Fetch } from './fetch.js';
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  GetScheduleItemResponse,
  GetScheduleItemsResponse,
  GetScheduleItemTasksResponse,
  GetScheduleResponse,
} from '@web/controllers/api/schedules.js';
import { ScheduleItemsOptions } from '@web/schemas/generated/schedule-items-options.js';
import { UseQueryData } from './react-query.js';
import { mapTask, useTaskQuery } from './use-task-query.js';

export const useEmployeeScheduleItemTasksQuery = ({
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
    queryKey: ['employee-schedule', scheduleId, 'item', itemId, 'tasks'],
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

            const tasks: GetScheduleItemTasksResponse = await response.json();

            for (const task of tasks) {
              queryClient.setQueryData<UseQueryData<typeof useTaskQuery>>(['task', task.id], mapTask(task));
            }

            return tasks;
          },
  });
};
