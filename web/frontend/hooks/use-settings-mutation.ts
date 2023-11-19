import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import type { ShopSettings } from '../../schemas/generated/shop-settings';
import { useAuthenticatedFetch } from '@teifi-digital/shopify-app-react';

export const useSettingsMutation = (options: UseMutationOptions<unknown, unknown, ShopSettings>) => {
  const fetch = useAuthenticatedFetch();
  return useMutation(
    ['settings'],
    (settings: ShopSettings) =>
      fetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify(settings),
        headers: { 'Content-Type': 'application/json' },
      }),
    options,
  );
};
