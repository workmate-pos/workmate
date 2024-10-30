import { Fetch } from './fetch.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UseQueryData } from './react-query.js';
import { useScheduleEventQuery } from './use-schedule-event-query.js';
import { useScheduleEventsQuery } from './use-schedule-events-query.js';

export const useDeleteScheduleEventMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['schedule-event'],
    mutationFn: async ({ scheduleId, eventId }: { scheduleId: number; eventId: number }) => {
      const response = await fetch(
        `/api/schedules/${encodeURIComponent(scheduleId)}/events/${encodeURIComponent(eventId)}`,
        { method: 'DELETE' },
      );

      if (!response.ok) {
        throw new Error('Failed to delete employee schedule event');
      }

      return null;
    },
    async onMutate(event, ...args) {
      const currentEvent = queryClient.getQueryData<UseQueryData<typeof useScheduleEventQuery>>([
        'schedule',
        event.scheduleId,
        'event',
        event.eventId,
      ]);

      for (const [queryKey, queryData] of queryClient.getQueriesData<UseQueryData<typeof useScheduleEventsQuery>>({
        queryKey: ['schedule', event.scheduleId, 'event', 'list'],
      })) {
        if (!queryData) {
          continue;
        }

        queryClient.cancelQueries({ queryKey });
        queryClient.setQueryData<UseQueryData<typeof useScheduleEventsQuery>>(
          queryKey,
          queryData.filter(({ id }) => id !== event.eventId),
        );
      }

      if (currentEvent) {
        queryClient.removeQueries({ queryKey: ['schedule', event.scheduleId, 'event', event.eventId] });
      }

      return currentEvent;
    },
    async onError(_1, _2, previousValue) {
      if (previousValue) {
        queryClient.setQueryData<UseQueryData<typeof useScheduleEventQuery>>(
          ['schedule', previousValue.scheduleId, 'event', previousValue.id],
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
