import { Fetch } from './fetch.js';
import { useMutation } from '@tanstack/react-query';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { SyncOrderResponse } from '@web/controllers/api/order.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';

export const useOrderSyncMutation = ({ fetch }: { fetch: Fetch }) =>
  useMutation({
    mutationFn: async (orderId: ID) => {
      const response = await fetch(`/api/order/${parseGid(orderId).id}/sync`, {
        method: 'POST',
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(extractErrorMessage(text, 'Failed to sync order'));
      }

      const result: SyncOrderResponse = await response.json();
      return result;
    },
  });
