import { Fetch } from './fetch.js';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GetScheduleResponse } from '@web/controllers/api/schedules.js';
import { UpsertSchedule } from '@web/schemas/generated/upsert-schedule.js';
import { UseQueryData } from './react-query.js';
import { useSchedulesQuery } from './use-schedules-query.js';
import { useScheduleQuery } from './use-schedule-query.js';

export const useDeleteScheduleMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const response = await fetch(`/api/schedules/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete employee schedule');
      }
    },
    async onSuccess(_, { id }) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['schedule', 'all'] }),
        queryClient.invalidateQueries({ queryKey: ['schedule', 'list'] }),
      ]);

      queryClient.removeQueries({ queryKey: ['schedule', id] });
    },
  });
};
