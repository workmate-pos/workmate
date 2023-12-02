import { useMutation, UseMutationOptions } from 'react-query';
import type { ShopSettings } from '../../schemas/generated/shop-settings';
import { useAuthenticatedFetch } from '@teifi-digital/shopify-app-react';

export const useSettingsMutation = (options: UseMutationOptions<void, unknown, ShopSettings, string[]>) => {
  const fetch = useAuthenticatedFetch();
  return useMutation({
    mutationKey: ['settings'],
    mutationFn: (settings: ShopSettings) =>
      fetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify(settings),
        headers: { 'Content-Type': 'application/json' },
      }).then(() => void 0),
    ...options,
  });
};
