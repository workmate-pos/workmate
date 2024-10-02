import { Fetch } from './fetch.js';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { GetAvailabilityResponse } from '@web/controllers/api/schedules.js';
import { UseQueryData } from './react-query.js';
import { DateTime, UpsertAvailability } from '@web/schemas/generated/upsert-availability.js';
import { mapEmployeeAvailability, useEmployeeAvailabilityQuery } from './use-employee-availability-query.js';
import { EmployeeAvailability } from '@web/services/schedules/queries.js';
import { useEmployeeAvailabilitiesQuery } from './use-employee-availabilities-query.js';

// when creating new availabilities we use a fake id for optimistic updates
let fakeIdSeq = 0;

export const useEmployeeAvailabilityMutation = (
  { fetch }: { fetch: Fetch },
  options?: UseMutationOptions<
    EmployeeAvailability,
    Error,
    Omit<UpsertAvailability, 'start' | 'end'> & { id: number | null; start: Date; end: Date },
    { currentAvailability: EmployeeAvailability | undefined; fakeId: number | null }
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ['employee-availability'],
    mutationFn: async ({
      id,
      ...body
    }: Omit<UpsertAvailability, 'start' | 'end'> & { id: number | null; start: Date; end: Date }) => {
      const response = await fetch(`/api/schedules/availability/${id === null ? '' : encodeURIComponent(id)}`, {
        method: 'POST',
        body: JSON.stringify({
          ...body,
          start: body.start.toISOString() as DateTime,
          end: body.end.toISOString() as DateTime,
        } satisfies UpsertAvailability),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to mutate employee availability');
      }

      const items: GetAvailabilityResponse = await response.json();
      return mapEmployeeAvailability(items);
    },
    // Optimistic update
    async onMutate(availability, ...args) {
      const currentAvailability = queryClient.getQueryData<UseQueryData<typeof useEmployeeAvailabilityQuery>>([
        'employee-availability',
        availability.id,
      ]);

      let fakeId: number | null = null;
      const id = availability.id ?? (fakeId = -fakeIdSeq++);

      const { available, staffMemberId, end, start, description } = availability;
      const data: UseQueryData<typeof useEmployeeAvailabilityQuery> | undefined = {
        createdAt: new Date(),
        ...currentAvailability,
        id,
        updatedAt: new Date(),
        available,
        staffMemberId,
        end,
        start,
        description,
      };

      queryClient.cancelQueries({ queryKey: ['employee-availability', id] });
      queryClient.setQueryData<UseQueryData<typeof useEmployeeAvailabilityQuery>>(['employee-availability', id], data);

      for (const [queryKey, queryData] of queryClient.getQueriesData<
        UseQueryData<typeof useEmployeeAvailabilitiesQuery>
      >({ queryKey: ['employee-availability', 'list'] })) {
        if (!queryData) {
          continue;
        }

        queryClient.cancelQueries({ queryKey });
        queryClient.setQueryData(queryKey, [...queryData.filter(x => x.id !== id), data]);
      }

      await options?.onMutate?.(availability, ...args);

      return { currentAvailability, fakeId };
    },
    async onSuccess(availability, ...args) {
      const isMutating = queryClient.isMutating({
        mutationKey: ['employee-availability'],
        predicate: mutation => mutation.state.variables.id === availability.id,
      });

      if (!isMutating) {
        queryClient.setQueryData<UseQueryData<typeof useEmployeeAvailabilityQuery>>(
          ['employee-availability', availability.id],
          availability,
        );
      }

      await options?.onSuccess?.(availability, ...args);
    },
    async onError(_1, _2, context) {
      if (context?.currentAvailability) {
        queryClient.setQueryData<UseQueryData<typeof useEmployeeAvailabilityQuery>>(
          ['employee-availability', context.currentAvailability.id],
          context.currentAvailability,
        );
      }

      await options?.onError?.(_1, _2, context);
    },
    async onSettled(_1, _2, _3, context) {
      if (context?.fakeId) {
        queryClient.removeQueries({ queryKey: ['employee-availability', context.fakeId] });
      }

      await queryClient.invalidateQueries({ queryKey: ['employee-availability', 'list'] });
      await options?.onSettled?.(_1, _2, _3, context);
    },
  });
};
