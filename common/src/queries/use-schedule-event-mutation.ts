import { Fetch } from './fetch.js';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { GetScheduleEventResponse } from '@web/controllers/api/schedules.js';
import { UseQueryData } from './react-query.js';
import { mapItem, useScheduleEventQuery } from './use-schedule-event-query.js';
import { DateTime, UpsertScheduleEvent } from '@web/schemas/generated/upsert-schedule-event.js';
import { useScheduleEventsQuery } from './use-schedule-events-query.js';

// when creating new availabilities we use a fake id for optimistic updates
let fakeIdSeq = 0;

export const useScheduleEventMutation = (
  { fetch }: { fetch: Fetch },
  options?: UseMutationOptions<
    GetScheduleEventResponse,
    unknown,
    Omit<UpsertScheduleEvent, 'start' | 'end'> & { scheduleId: number; itemId: number | null; start: Date; end: Date },
    unknown
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ['schedule-event'],
    mutationFn: async ({
      scheduleId,
      itemId,
      ...body
    }: Omit<UpsertScheduleEvent, 'start' | 'end'> & {
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
          } satisfies UpsertScheduleEvent),
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to mutate employee schedule item');
      }

      const items: GetScheduleEventResponse = await response.json();
      return items;
    },
    async onMutate(item, ...args) {
      const currentItem = queryClient.getQueryData<UseQueryData<typeof useScheduleEventQuery>>([
        'schedule',
        item.scheduleId,
        'item',
        item.itemId,
      ]);

      let fakeId: number | null = null;
      const id = item.itemId ?? (fakeId = -fakeIdSeq++);

      const { end, start, name, description, color, staffMemberIds, taskIds } = item;
      const data: UseQueryData<typeof useScheduleEventQuery> = {
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

      queryClient.cancelQueries({ queryKey: ['schedule', item.scheduleId, 'item', item.itemId] });
      queryClient.setQueryData<UseQueryData<typeof useScheduleEventQuery>>(
        ['schedule', item.scheduleId, 'item', id],
        data,
      );

      for (const [queryKey, queryData] of queryClient.getQueriesData<UseQueryData<typeof useScheduleEventsQuery>>({
        queryKey: ['schedule', item.scheduleId, 'item', 'list'],
      })) {
        if (!queryData) {
          continue;
        }

        queryClient.cancelQueries({ queryKey });
        queryClient.setQueryData<UseQueryData<typeof useScheduleEventsQuery>>(queryKey, [
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
        mutationKey: ['schedule-event'],
        predicate: mutation => mutation.state.variables.itemId === item.id,
      });

      if (!isMutating) {
        queryClient.setQueryData<UseQueryData<typeof useScheduleEventQuery>>(
          ['schedule', item.scheduleId, 'item', item.id],
          mapItem(item),
        );
      }

      await options?.onSuccess?.(...args);
    },
    async onError(_1, _2, context) {
      if (context?.currentItem) {
        queryClient.setQueryData<UseQueryData<typeof useScheduleEventQuery>>(
          ['schedule', context.currentItem.scheduleId, 'item', context.currentItem.id],
          context.currentItem,
        );
      }

      await options?.onError?.(_1, _2, context);
    },
    async onSettled(_1, _2, input, context) {
      if (context?.fakeId) {
        queryClient.removeQueries({
          queryKey: ['schedule', input.scheduleId, 'item', context.fakeId],
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['schedule', input.scheduleId] }),
        queryClient.invalidateQueries({ queryKey: ['schedule', 'all'] }),
      ]);

      await options?.onSettled?.(_1, _2, input, context);
    },
  });
};
