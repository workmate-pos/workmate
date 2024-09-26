import { Fetch } from './fetch.js';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { BulkDeleteSchedules } from '@web/schemas/generated/bulk-delete-schedules.js';

export const useBulkDeleteEmployeeScheduleMutation = (
  { fetch }: { fetch: Fetch },
  options?: UseMutationOptions<void, unknown, BulkDeleteSchedules, string[]>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async (body: BulkDeleteSchedules) => {
      const response = await fetch(`/api/schedules/bulk`, {
        method: 'DELETE',
        body: JSON.stringify(body satisfies BulkDeleteSchedules),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to mutate employee schedules');
      }
    },
    async onSuccess(_1, input, ...args) {
      await queryClient.invalidateQueries({ queryKey: ['employee-schedule', 'list'] });

      for (const schedule of input.schedules) {
        queryClient.removeQueries({
          queryKey: ['employee-schedule', schedule.id],
        });
      }

      await options?.onSuccess?.(_1, input, ...args);
    },
  });
};
