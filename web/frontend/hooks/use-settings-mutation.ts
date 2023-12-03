import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import type { ShopSettings } from '../../schemas/generated/shop-settings';
import { useAuthenticatedFetch } from '@teifi-digital/shopify-app-react';

export const useSettingsMutation = (options: UseMutationOptions<void, unknown, ShopSettings, string[]>) => {
  const fetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (settings: ShopSettings) =>
      fetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify(settings),
        headers: { 'Content-Type': 'application/json' },
      }).then(() => void 0),
    onSuccess(...args) {
      queryClient.invalidateQueries(['settings']);

      options.onSuccess?.(...args);
    },
  });
};
