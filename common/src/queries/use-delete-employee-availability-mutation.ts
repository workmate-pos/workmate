import { Fetch } from './fetch.js';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { UseQueryData } from './react-query.js';
import { useEmployeeAvailabilityQuery } from './use-employee-availability-query.js';
import { EmployeeAvailability } from '@web/services/schedules/queries.js';
import { useEmployeeAvailabilitiesQuery } from './use-employee-availabilities-query.js';

export const useDeleteEmployeeAvailabilityMutation = (
  { fetch }: { fetch: Fetch },
  options?: UseMutationOptions<void, Error, { id: number }, EmployeeAvailability | undefined>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ['employee-availability'],
    mutationFn: async ({ id }: { id: number }) => {
      const response = await fetch(`/api/schedules/availability/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete employee availability');
      }
    },
    // Optimistic update
    async onMutate(availability, ...args) {
      const currentAvailability = queryClient.getQueryData<UseQueryData<typeof useEmployeeAvailabilityQuery>>([
        'employee-availability',
        availability.id,
      ]);

      if (currentAvailability) {
        queryClient.removeQueries({
          queryKey: ['employee-availability', currentAvailability.id],
        });
      }

      for (const [queryKey, queryData] of queryClient.getQueriesData<
        UseQueryData<typeof useEmployeeAvailabilitiesQuery>
      >({ queryKey: ['employee-availability', 'list'] })) {
        if (!queryData) {
          return;
        }

        queryClient.cancelQueries({ queryKey });

        queryClient.setQueryData<UseQueryData<typeof useEmployeeAvailabilitiesQuery>>(
          queryKey,
          queryData.filter(({ id }) => id !== availability.id),
        );
      }

      await options?.onMutate?.(availability, ...args);

      return currentAvailability;
    },
    async onError(_1, _2, previousValue) {
      if (previousValue) {
        queryClient.setQueryData<UseQueryData<typeof useEmployeeAvailabilityQuery>>(
          ['employee-availability', previousValue.id],
          previousValue,
        );
      }

      await options?.onError?.(_1, _2, previousValue);
    },
    async onSettled(...args) {
      await queryClient.invalidateQueries({ queryKey: ['employee-availability', 'list'] });
      await options?.onSettled?.(...args);
    },
  });
};
