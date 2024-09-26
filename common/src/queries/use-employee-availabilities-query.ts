import { Fetch } from './fetch.js';
import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { GetAvailabilitiesResponse } from '@web/controllers/api/schedules.js';
import { UseQueryData } from './react-query.js';
import { AvailabilityOptions } from '@web/schemas/generated/availability-options.js';
import { mapEmployeeAvailability, useEmployeeAvailabilityQuery } from './use-employee-availability-query.js';
import { EmployeeAvailability } from '@web/services/schedules/queries.js';

export const useEmployeeAvailabilitiesQuery = (
  {
    fetch,
    filters,
  }: {
    fetch: Fetch;
    filters: Omit<AvailabilityOptions, 'from' | 'to'> & { from: Date; to: Date };
  },
  options?: Partial<
    UseQueryOptions<
      EmployeeAvailability[],
      Error,
      EmployeeAvailability[],
      (string | (Omit<AvailabilityOptions, 'from' | 'to'> & { from: Date; to: Date }))[]
    >
  >,
) => {
  const queryClient = useQueryClient();

  return useQuery({
    ...options,
    queryKey: ['employee-availability', 'list', filters],
    queryFn: async () => {
      const { from, to, staffMemberId } = filters;
      const searchParams = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });

      if (staffMemberId) searchParams.set('staffMemberId', staffMemberId);

      const response = await fetch(`/api/schedules/availability?${searchParams.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch employee availabilities');
      }

      const availabilities: GetAvailabilitiesResponse = await response.json();

      for (const availability of availabilities) {
        queryClient.setQueryData(
          ['employee-availability', availability.id],
          mapEmployeeAvailability(availability) satisfies UseQueryData<typeof useEmployeeAvailabilityQuery>,
        );
      }

      return availabilities.map(mapEmployeeAvailability);
    },
  });
};
