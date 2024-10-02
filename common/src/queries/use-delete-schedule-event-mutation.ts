import { Fetch } from './fetch.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UseQueryData } from './react-query.js';
import { useScheduleEventQuery } from './use-schedule-event-query.js';
import { useScheduleEventsQuery } from './use-schedule-events-query.js';

export const useDeleteScheduleEventMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['schedule-event'],
    mutationFn: async ({ scheduleId, itemId }: { scheduleId: number; itemId: number }) => {
      const response = await fetch(
        `/api/schedules/${encodeURIComponent(scheduleId)}/items/${encodeURIComponent(itemId)}`,
        { method: 'DELETE' },
      );

      if (!response.ok) {
        throw new Error('Failed to delete employee schedule item');
      }

      return null;
    },
    async onMutate(item, ...args) {
      const currentItem = queryClient.getQueryData<UseQueryData<typeof useScheduleEventQuery>>([
        'schedule',
        item.scheduleId,
        'item',
        item.itemId,
      ]);

      for (const [queryKey, queryData] of queryClient.getQueriesData<UseQueryData<typeof useScheduleEventsQuery>>({
        queryKey: ['schedule', item.scheduleId, 'item', 'list'],
      })) {
        if (!queryData) {
          continue;
        }

        queryClient.cancelQueries({ queryKey });
        queryClient.setQueryData<UseQueryData<typeof useScheduleEventsQuery>>(
          queryKey,
          queryData.filter(({ id }) => id !== item.itemId),
        );
      }

      if (currentItem) {
        queryClient.removeQueries({ queryKey: ['schedule', item.scheduleId, 'item', item.itemId] });
      }

      return currentItem;
    },
    async onError(_1, _2, previousValue) {
      if (previousValue) {
        queryClient.setQueryData<UseQueryData<typeof useScheduleEventQuery>>(
          ['schedule', previousValue.scheduleId, 'item', previousValue.id],
          previousValue,
        );
      }
    },
    async onSettled(_1, _2, { scheduleId }) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['schedule', scheduleId] }),
        queryClient.invalidateQueries({ queryKey: ['schedule', 'all'] }),
        queryClient.invalidateQueries({ queryKey: ['schedule', 'list'] }),
      ]);
    },
  });
};
