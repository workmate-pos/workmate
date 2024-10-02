import { Fetch } from './fetch.js';
import { skipToken, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { GetAvailabilityResponse } from '@web/controllers/api/schedules.js';
import { EmployeeAvailability } from '@web/services/schedules/queries.js';

export const useEmployeeAvailabilityQuery = (
  {
    fetch,
    id,
  }: {
    fetch: Fetch;
    id: number | null;
  },
  options?: Partial<UseQueryOptions<EmployeeAvailability, Error, EmployeeAvailability, (string | number | null)[]>>,
) =>
  useQuery({
    ...options,
    queryKey: ['employee-availability', id],
    queryFn:
      id === null
        ? skipToken
        : async () => {
            const response = await fetch(`/api/schedules/availability/${encodeURIComponent(id)}`);

            if (!response.ok) {
              throw new Error('Failed to fetch employee availability');
            }

            const availability: GetAvailabilityResponse = await response.json();
            return mapEmployeeAvailability(availability);
          },
  });

export function mapEmployeeAvailability(availability: GetAvailabilityResponse): EmployeeAvailability {
  return {
    ...availability,
    start: new Date(availability.start),
    end: new Date(availability.end),
    createdAt: new Date(availability.createdAt),
    updatedAt: new Date(availability.updatedAt),
  };
}
