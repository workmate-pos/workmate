import { Fetch } from './fetch.js';
import { skipToken, useMutation, UseMutationOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { GetScheduleResponse } from '@web/controllers/api/schedules.js';
import { UpsertSchedule } from '@web/schemas/generated/upsert-schedule.js';
import { UseQueryData } from './react-query.js';
import { useSchedulesQuery } from './use-schedules-query.js';
import { mapSchedule, useScheduleQuery } from './use-schedule-query.js';
import { BulkUpsertSchedules } from '@web/schemas/generated/bulk-upsert-schedules.js';

export const useBulkScheduleMutation = (
  { fetch }: { fetch: Fetch },
  options?: UseMutationOptions<GetScheduleResponse[], unknown, BulkUpsertSchedules, string[]>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async (body: BulkUpsertSchedules) => {
      const response = await fetch(`/api/schedules/bulk`, {
        method: 'POST',
        body: JSON.stringify(body satisfies BulkUpsertSchedules),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to mutate employee schedules');
      }

      const schedules: GetScheduleResponse[] = await response.json();
      return schedules;
    },
    async onSuccess(schedules, ...args) {
      for (const schedule of schedules) {
        queryClient.setQueryData(
          ['schedule', schedule.id],
          mapSchedule(schedule) satisfies UseQueryData<typeof useScheduleQuery>,
        );
      }

      await queryClient.invalidateQueries({ queryKey: ['schedule', 'list'] });
      await options?.onSuccess?.(schedules, ...args);
    },
  });
};
