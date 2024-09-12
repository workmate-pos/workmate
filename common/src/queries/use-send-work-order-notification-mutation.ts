import { Fetch } from './fetch.js';
import { useMutation, useQueryClient } from 'react-query';
import { SendWorkOrderNotificationResponse } from '@web/controllers/api/work-order.js';
import { SendWorkOrderNotification } from '@web/schemas/generated/send-work-order-notification.js';

export const useSendWorkOrderNotificationMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, body }: { name: string; body: SendWorkOrderNotification }) => {
      const response = await fetch(`/api/work-order/${encodeURIComponent(name)}/notification`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to send work order notification');
      }

      const result: SendWorkOrderNotificationResponse = await response.json();
      return result;
    },
    onSuccess(...args) {
      const [_, { name }] = args;

      queryClient.invalidateQueries(['work-order', name]);
      queryClient.invalidateQueries(['work-order-info']);
    },
  });
};
