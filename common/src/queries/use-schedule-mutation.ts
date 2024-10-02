import { Fetch } from './fetch.js';
import { skipToken, useMutation, UseMutationOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { GetScheduleResponse } from '@web/controllers/api/schedules.js';
import { DateTime, UpsertSchedule } from '@web/schemas/generated/upsert-schedule.js';
import { UseQueryData } from './react-query.js';
import { useSchedulesQuery, UseSchedulesQueryQueryData } from './use-schedules-query.js';
import { mapSchedule, useScheduleQuery } from './use-schedule-query.js';

let fakeIdSeq = 0;

export const useScheduleMutation = (
  { fetch }: { fetch: Fetch },
  options?: UseMutationOptions<
    GetScheduleResponse,
    Error,
    Omit<UpsertSchedule, 'publishedAt'> & { publishedAt: Date | null; id: number | null }
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ['schedule'],
    mutationFn: async ({
      id,
      ...body
    }: Omit<UpsertSchedule, 'publishedAt'> & { publishedAt: Date | null; id: number | null }) => {
      const response = await fetch(`/api/schedules/${id === null ? '' : encodeURIComponent(id)}`, {
        method: 'POST',
        body: JSON.stringify({
          ...body,
          publishedAt: body.publishedAt ? (body.publishedAt.toISOString() as DateTime) : null,
        } satisfies UpsertSchedule),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to mutate employee schedule');
      }

      const schedule: GetScheduleResponse = await response.json();
      return schedule;
    },
    // optimistic
    async onMutate(schedule, ...args) {
      const currentSchedule = queryClient.getQueryData<UseQueryData<typeof useScheduleQuery>>([
        'schedule',
        schedule.id,
      ]);

      let fakeId: number | null = null;
      const id = schedule.id ?? (fakeId = -fakeIdSeq++);

      const { publishedAt, name, locationId } = schedule;

      const data: UseQueryData<typeof useScheduleQuery> = {
        createdAt: new Date(),
        ...currentSchedule,
        id,
        updatedAt: new Date(),
        publishedAt,
        name,
        locationId,
      };

      queryClient.cancelQueries({ queryKey: ['schedule', id] });
      queryClient.setQueryData<UseQueryData<typeof useScheduleQuery>>(['schedule', schedule.id], data);

      for (const [queryKey, queryData] of queryClient.getQueriesData<UseSchedulesQueryQueryData>({
        queryKey: ['schedule', 'list'],
      })) {
        if (!queryData) {
          continue;
        }

        queryClient.cancelQueries({ queryKey });
        queryClient.setQueryData<UseSchedulesQueryQueryData>(queryKey, {
          ...queryData,
          pages: queryData.pages.map((page, i) => ({
            ...page,
            schedules: [...page.schedules.filter(s => s.id !== id), ...(i === 0 ? [data] : [])],
          })),
        });
      }

      await options?.onMutate?.(schedule, ...args);

      return { currentSchedule, fakeId };
    },
    async onSuccess(schedule, ...args) {
      const isMutating = queryClient.isMutating({
        mutationKey: ['schedule'],
        predicate: mutation => mutation.state.variables.id === schedule.id,
      });

      if (!isMutating) {
        queryClient.setQueryData<UseQueryData<typeof useScheduleQuery>>(
          ['schedule', schedule.id],
          mapSchedule(schedule),
        );
      }

      await options?.onSuccess?.(schedule, ...args);
    },
    async onError(_1, _2, context) {
      if (context?.currentSchedule) {
        queryClient.setQueryData<UseQueryData<typeof useScheduleQuery>>(
          ['schedule', context.currentSchedule.id],
          context.currentSchedule,
        );
      }

      await options?.onError?.(_1, _2, context);
    },
    async onSettled(_1, _2, input, context) {
      if (context?.fakeId) {
        queryClient.removeQueries({ queryKey: ['schedule', context.fakeId] });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['schedule', input.id] }),
        queryClient.invalidateQueries({ queryKey: ['schedule', 'list'] }),
      ]);

      await options?.onSettled?.(_1, _2, input, context);
    },
  });
};
