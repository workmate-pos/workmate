import { Fetch } from './fetch.js';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GetScheduleResponse } from '@web/controllers/api/schedules.js';
import { UpsertSchedule } from '@web/schemas/generated/upsert-schedule.js';
import { UseQueryData } from './react-query.js';
import { useSchedulesQuery, UseSchedulesQueryQueryData } from './use-schedules-query.js';
import { useScheduleQuery } from './use-schedule-query.js';

export const useDeleteScheduleMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['schedule'],
    mutationFn: async ({ id }: { id: number }) => {
      const response = await fetch(`/api/schedules/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete employee schedule');
      }
    },
    // optimistic update
    async onMutate(schedule, ...args) {
      const currentSchedule = queryClient.getQueryData<UseQueryData<typeof useScheduleQuery>>([
        'schedule',
        schedule.id,
      ]);

      if (currentSchedule) {
        queryClient.removeQueries({ queryKey: ['schedule', currentSchedule.id] });
      }

      for (const [queryKey, queryData] of queryClient.getQueriesData<UseSchedulesQueryQueryData>({
        queryKey: ['schedule', 'list'],
      })) {
        if (!queryData) {
          continue;
        }

        queryClient.cancelQueries({ queryKey });
        queryClient.setQueryData<UseSchedulesQueryQueryData>(queryKey, {
          ...queryData,
          pages: queryData.pages.map(page => ({
            ...page,
            schedules: page.schedules.filter(s => s.id !== schedule.id),
          })),
        });
      }

      return currentSchedule;
    },
    async onError(_1, _2, previousValue) {
      if (previousValue) {
        queryClient.setQueryData<UseQueryData<typeof useScheduleQuery>>(['schedule', previousValue.id], previousValue);
        await queryClient.invalidateQueries({ queryKey: ['schedule', 'list'] });
      }
    },
  });
};
