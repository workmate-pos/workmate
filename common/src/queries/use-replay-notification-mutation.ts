import { Fetch } from './fetch.js';
import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import { ReplayNotificationResponse } from '@web/controllers/api/notifications.js';
import { UseQueryData } from './react-query.js';
import { useNotificationsQuery } from './use-notifications-query.js';

export const useReplayNotificationMutation = (
  { fetch }: { fetch: Fetch },
  options?: UseMutationOptions<ReplayNotificationResponse, unknown, string, unknown>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async (uuid: string) => {
      const response = await fetch(`/api/notifications/${encodeURIComponent(uuid)}/replay`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to replay notification');
      }

      const result: ReplayNotificationResponse = await response.json();
      return result;
    },
    onSuccess(...args) {
      const [result] = args;

      for (const [queryKey, data] of queryClient.getQueriesData<UseQueryData<typeof useNotificationsQuery>>([
        'notifications',
      ])) {
        queryClient.setQueryData(queryKey, {
          ...data,
          pages: data.pages.map(page =>
            page.map(notification => (notification.uuid === result.uuid ? result : notification)),
          ),
        });
      }

      queryClient.invalidateQueries(['notifications']);

      options?.onSuccess?.(...args);
    },
  });
};
