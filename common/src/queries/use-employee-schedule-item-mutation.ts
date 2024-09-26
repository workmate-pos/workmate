import { Fetch } from './fetch.js';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { GetScheduleItemResponse } from '@web/controllers/api/schedules.js';
import { UseQueryData } from './react-query.js';
import { mapItem, useEmployeeScheduleItemQuery } from './use-employee-schedule-item-query.js';
import { DateTime, UpsertScheduleItem } from '@web/schemas/generated/upsert-schedule-item.js';
import { useEmployeeScheduleItemsQuery } from './use-employee-schedule-items-query.js';

// when creating new availabilities we use a fake id for optimistic updates
let fakeIdSeq = 0;

export const useEmployeeScheduleItemMutation = (
  { fetch }: { fetch: Fetch },
  options?: UseMutationOptions<
    GetScheduleItemResponse,
    unknown,
    Omit<UpsertScheduleItem, 'start' | 'end'> & { scheduleId: number; itemId: number | null; start: Date; end: Date },
    unknown
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ['employee-schedule-item'],
    mutationFn: async ({
      scheduleId,
      itemId,
      ...body
    }: Omit<UpsertScheduleItem, 'start' | 'end'> & {
      scheduleId: number;
      itemId: number | null;
      start: Date;
      end: Date;
    }) => {
      const response = await fetch(
        `/api/schedules/${encodeURIComponent(scheduleId)}/items/${itemId === null ? '' : encodeURIComponent(itemId)}`,
        {
          method: 'POST',
          body: JSON.stringify({
            ...body,
            start: body.start.toISOString() as DateTime,
            end: body.end.toISOString() as DateTime,
          } satisfies UpsertScheduleItem),
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to mutate employee schedule item');
      }

      const items: GetScheduleItemResponse = await response.json();
      return items;
    },
    async onMutate(item, ...args) {
      const currentItem = queryClient.getQueryData<UseQueryData<typeof useEmployeeScheduleItemQuery>>([
        'employee-schedule',
        item.scheduleId,
        'item',
        item.itemId,
      ]);

      let fakeId: number | null = null;
      const id = item.itemId ?? (fakeId = -fakeIdSeq++);

      const { end, start, name, description, color, staffMemberIds, taskIds } = item;
      const data: UseQueryData<typeof useEmployeeScheduleItemQuery> = {
        createdAt: new Date(),
        scheduleId: item.scheduleId,
        ...currentItem,
        id,
        updatedAt: new Date(),
        end,
        start,
        name,
        description,
        color,
        assignedStaffMemberIds: staffMemberIds,
        taskIds,
      };

      queryClient.cancelQueries({ queryKey: ['employee-schedule', item.scheduleId, 'item', item.itemId] });
      queryClient.setQueryData<UseQueryData<typeof useEmployeeScheduleItemQuery>>(
        ['employee-schedule', item.scheduleId, 'item', id],
        data,
      );

      for (const [queryKey, queryData] of queryClient.getQueriesData<
        UseQueryData<typeof useEmployeeScheduleItemsQuery>
      >({
        queryKey: ['employee-schedule', item.scheduleId, 'item', 'list'],
      })) {
        if (!queryData) {
          continue;
        }

        queryClient.cancelQueries({ queryKey });
        queryClient.setQueryData<UseQueryData<typeof useEmployeeScheduleItemsQuery>>(queryKey, [
          ...queryData.filter(x => x.id !== item.itemId),
          data,
        ]);
      }

      await options?.onMutate?.(item, ...args);

      return {
        currentItem,
        fakeId,
      };
    },
    async onSuccess(...args) {
      const [item, { scheduleId }] = args;

      const isMutating = queryClient.isMutating({
        mutationKey: ['employee-schedule-item'],
        predicate: mutation => mutation.state.variables.itemId === item.id,
      });

      if (!isMutating) {
        queryClient.setQueryData<UseQueryData<typeof useEmployeeScheduleItemQuery>>(
          ['employee-schedule', item.scheduleId, 'item', item.id],
          mapItem(item),
        );
      }

      await options?.onSuccess?.(...args);
    },
    async onError(_1, _2, context) {
      if (context?.currentItem) {
        queryClient.setQueryData<UseQueryData<typeof useEmployeeScheduleItemQuery>>(
          ['employee-schedule', context.currentItem.scheduleId, 'item', context.currentItem.id],
          context.currentItem,
        );
      }

      await options?.onError?.(_1, _2, context);
    },
    async onSettled(_1, _2, input, context) {
      if (context?.fakeId) {
        queryClient.removeQueries({
          queryKey: ['employee-schedule', input.scheduleId, 'item', context.fakeId],
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employee-schedule', input.scheduleId] }),
        queryClient.invalidateQueries({ queryKey: ['employee-schedule', 'all'] }),
      ]);

      await options?.onSettled?.(_1, _2, input, context);
    },
  });
};
