import { Fetch } from './fetch.js';
import { skipToken, useMutation, UseMutationOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { GetScheduleResponse } from '@web/controllers/api/schedules.js';
import { DateTime, UpsertSchedule } from '@web/schemas/generated/upsert-schedule.js';
import { UseQueryData } from './react-query.js';
import { useEmployeeSchedulesQuery } from './use-employee-schedules-query.js';
import { mapSchedule, useEmployeeScheduleQuery } from './use-employee-schedule-query.js';

export const useEmployeeScheduleMutation = (
  { fetch }: { fetch: Fetch },
  options?: UseMutationOptions<
    GetScheduleResponse,
    Error,
    Omit<UpsertSchedule, 'publishedAt'> & { publishedAt: Date | null; id: number | null }
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({
      id,
      ...body
    }: Omit<UpsertSchedule, 'publishedAt'> & { publishedAt: Date | null; id: number | null }) => {
      const response = await fetch(`/api/schedules/${id === null ? '' : encodeURIComponent(id)}`, {
        method: 'POST',
        body: JSON.stringify({
          ...body,
          publishedAt: body.publishedAt ? (body.publishedAt.toISOString() as DateTime) : null,
        } satisfies UpsertSchedule),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to mutate employee schedule');
      }

      const schedule: GetScheduleResponse = await response.json();
      return schedule;
    },
    async onSuccess(schedule, ...args) {
      queryClient.setQueryData<UseQueryData<typeof useEmployeeScheduleQuery>>(
        ['employee-schedule', schedule.id],
        mapSchedule(schedule),
      );

      await options?.onSuccess?.(schedule, ...args);
    },
  });
};
