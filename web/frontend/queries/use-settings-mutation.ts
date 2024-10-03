import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { ShopSettings } from '@web/services/settings/schema.js';

export const useSettingsMutation = (
  { fetch }: { fetch: ReturnType<typeof useAuthenticatedFetch> },
  options: UseMutationOptions<void, unknown, ShopSettings, string[]>,
) => {
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
      queryClient.invalidateQueries({ queryKey: ['settings'] });

      options.onSuccess?.(...args);
    },
  });
};
