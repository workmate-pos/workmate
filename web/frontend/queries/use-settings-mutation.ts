import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import { useAuthenticatedFetch } from '@teifi-digital/shopify-app-react';
import type { ShopSettings } from '../../schemas/generated/shop-settings.js';

export const useSettingsMutation = (options: UseMutationOptions<void, unknown, ShopSettings, string[]>) => {
  const fetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async (settings: ShopSettings) => {
      await fetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify(settings),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess(...args) {
      queryClient.invalidateQueries(['settings']);

      options.onSuccess?.(...args);
    },
  });
};
