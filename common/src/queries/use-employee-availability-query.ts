import { Fetch } from './fetch.js';
import { skipToken, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
  GetAvailabilitiesResponse,
  GetAvailabilityResponse,
  GetScheduleItemsResponse,
} from '@web/controllers/api/schedules.js';
import { ScheduleItemsOptions } from '@web/schemas/generated/schedule-items-options.js';
import { useEmployeeScheduleItemQuery } from './use-employee-schedule-item-query.js';
import { UseQueryData } from './react-query.js';
import { AvailabilityOptions } from '@web/schemas/generated/availability-options.js';
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
