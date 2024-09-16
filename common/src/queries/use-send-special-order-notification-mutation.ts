import { useMutation, useQueryClient } from 'react-query';
import { Fetch } from './fetch.js';
import { SendNotification } from '@web/schemas/generated/send-notification.js';
import { SendNotificationResponse } from '@web/controllers/api/special-orders.js';

export const useSendSpecialOrderNotificationMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, body }: { name: string; body: SendNotification }) => {
      const response = await fetch(`/api/special-orders/${encodeURIComponent(name)}/notification`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }

      const result: SendNotificationResponse = await response.json();
      return result;
    },
    onSuccess(...args) {
      const [_, { name }] = args;

      queryClient.invalidateQueries(['special-orders']);
      queryClient.invalidateQueries(['special-order', name]);
    },
  });
};
