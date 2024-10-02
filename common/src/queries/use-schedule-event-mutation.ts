import { Fetch } from './fetch.js';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { GetScheduleEventResponse } from '@web/controllers/api/schedules.js';
import { UseQueryData } from './react-query.js';
import { mapEvent, useScheduleEventQuery } from './use-schedule-event-query.js';
import { DateTime, UpsertScheduleEvent } from '@web/schemas/generated/upsert-schedule-event.js';
import { useScheduleEventsQuery } from './use-schedule-events-query.js';

// when creating new availabilities we use a fake id for optimistic updates
let fakeIdSeq = 0;

export const useScheduleEventMutation = (
  { fetch }: { fetch: Fetch },
  options?: UseMutationOptions<
    GetScheduleEventResponse,
    unknown,
    Omit<UpsertScheduleEvent, 'start' | 'end'> & { scheduleId: number; eventId: number | null; start: Date; end: Date },
    unknown
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ['schedule-event'],
    mutationFn: async ({
      scheduleId,
      eventId,
      ...body
    }: Omit<UpsertScheduleEvent, 'start' | 'end'> & {
      scheduleId: number;
      eventId: number | null;
      start: Date;
      end: Date;
    }) => {
      const response = await fetch(
        `/api/schedules/${encodeURIComponent(scheduleId)}/events/${eventId === null ? '' : encodeURIComponent(eventId)}`,
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
        throw new Error('Failed to mutate employee schedule event');
      }

      const events: GetScheduleEventResponse = await response.json();
      return events;
    },
    async onMutate(event, ...args) {
      const currentEvent = queryClient.getQueryData<UseQueryData<typeof useScheduleEventQuery>>([
        'schedule',
        event.scheduleId,
        'event',
        event.eventId,
      ]);

      let fakeId: number | null = null;
      const id = event.eventId ?? (fakeId = -fakeIdSeq++);

      const { end, start, name, description, color, staffMemberIds, taskIds } = event;
      const data: UseQueryData<typeof useScheduleEventQuery> = {
        createdAt: new Date(),
        scheduleId: event.scheduleId,
        ...currentEvent,
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

      queryClient.cancelQueries({ queryKey: ['schedule', event.scheduleId, 'event', event.eventId] });
      queryClient.setQueryData<UseQueryData<typeof useScheduleEventQuery>>(
        ['schedule', event.scheduleId, 'event', id],
        data,
      );

      for (const [queryKey, queryData] of queryClient.getQueriesData<UseQueryData<typeof useScheduleEventsQuery>>({
        queryKey: ['schedule', event.scheduleId, 'event', 'list'],
      })) {
        if (!queryData) {
          continue;
        }

        queryClient.cancelQueries({ queryKey });
        queryClient.setQueryData<UseQueryData<typeof useScheduleEventsQuery>>(queryKey, [
          ...queryData.filter(x => x.id !== event.eventId),
          data,
        ]);
      }

      await options?.onMutate?.(event, ...args);

      return {
        currentEvent,
        fakeId,
      };
    },
    async onSuccess(...args) {
      const [event] = args;

      const isMutating = queryClient.isMutating({
        mutationKey: ['schedule-event'],
        predicate: mutation => mutation.state.variables.eventId === event.id,
      });

      if (!isMutating) {
        queryClient.setQueryData<UseQueryData<typeof useScheduleEventQuery>>(
          ['schedule', event.scheduleId, 'event', event.id],
          mapEvent(event),
        );
      }

      await options?.onSuccess?.(...args);
    },
    async onError(_1, _2, context) {
      if (context?.currentEvent) {
        queryClient.setQueryData<UseQueryData<typeof useScheduleEventQuery>>(
          ['schedule', context.currentEvent.scheduleId, 'event', context.currentEvent.id],
          context.currentEvent,
        );
      }

      await options?.onError?.(_1, _2, context);
    },
    async onSettled(_1, _2, input, context) {
      if (context?.fakeId) {
        queryClient.removeQueries({
          queryKey: ['schedule', input.scheduleId, 'event', context.fakeId],
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
