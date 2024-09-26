import { Fetch } from './fetch.js';
import { skipToken, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { GetScheduleItemResponse } from '@web/controllers/api/schedules.js';

export const useEmployeeScheduleItemQuery = (
  {
    fetch,
    scheduleId,
    itemId,
  }: {
    fetch: Fetch;
    scheduleId: number | null;
    itemId: number | null;
  },
  options?: Partial<
    UseQueryOptions<DetailedEmployeeScheduleItem, Error, DetailedEmployeeScheduleItem, (string | number | null)[]>
  >,
) =>
  useQuery({
    ...options,
    queryKey: ['employee-schedule', scheduleId, 'item', itemId],
    queryFn:
      scheduleId === null || itemId === null
        ? skipToken
        : async () => {
            const response = await fetch(
              `/api/schedules/${encodeURIComponent(scheduleId)}/items/${encodeURIComponent(itemId)}`,
            );

            if (!response.ok) {
              throw new Error('Failed to fetch employee schedule item');
            }

            const item: GetScheduleItemResponse = await response.json();
            return mapItem(item);
          },
  });

export type DetailedEmployeeScheduleItem = ReturnType<typeof mapItem>;

export function mapItem(item: GetScheduleItemResponse) {
  return {
    ...item,
    start: new Date(item.start),
    end: new Date(item.end),
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
    assignedStaffMemberIds: item.assignedStaffMemberIds,
    taskIds: item.taskIds,
  };
}
