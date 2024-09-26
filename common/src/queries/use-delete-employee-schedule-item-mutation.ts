import { Fetch } from './fetch.js';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  GetScheduleItemResponse,
  GetScheduleItemsResponse,
  GetScheduleResponse,
} from '@web/controllers/api/schedules.js';
import { ScheduleItemsOptions } from '@web/schemas/generated/schedule-items-options.js';
import { UseQueryData } from './react-query.js';
import { useEmployeeScheduleItemQuery } from './use-employee-schedule-item-query.js';
import { useEmployeeScheduleItemsQuery } from './use-employee-schedule-items-query.js';

export const useDeleteEmployeeScheduleItemMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['employee-schedule-item'],
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
      const currentItem = queryClient.getQueryData<UseQueryData<typeof useEmployeeScheduleItemQuery>>([
        'employee-schedule',
        item.scheduleId,
        'item',
        item.itemId,
      ]);

      for (const [queryKey, queryData] of queryClient.getQueriesData<
        UseQueryData<typeof useEmployeeScheduleItemsQuery>
      >({ queryKey: ['employee-schedule', item.scheduleId, 'item', 'list'] })) {
        if (!queryData) {
          continue;
        }

        queryClient.cancelQueries({ queryKey });
        queryClient.setQueryData<UseQueryData<typeof useEmployeeScheduleItemsQuery>>(
          queryKey,
          queryData.filter(({ id }) => id !== item.itemId),
        );
      }

      if (currentItem) {
        queryClient.removeQueries({ queryKey: ['employee-schedule', item.scheduleId, 'item', item.itemId] });
      }

      return currentItem;
    },
    async onError(_1, _2, previousValue) {
      if (previousValue) {
        queryClient.setQueryData<UseQueryData<typeof useEmployeeScheduleItemQuery>>(
          ['employee-schedule', previousValue.scheduleId, 'item', previousValue.id],
          previousValue,
        );
      }
    },
    async onSettled(_1, _2, { scheduleId }) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employee-schedule', scheduleId] }),
        queryClient.invalidateQueries({ queryKey: ['employee-schedule', 'all'] }),
        queryClient.invalidateQueries({ queryKey: ['employee-schedule', 'list'] }),
      ]);
    },
  });
};
