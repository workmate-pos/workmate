import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import { useAuthenticatedFetch } from '@teifi-digital/shopify-app-react';

type SyncType = 'customer' | 'employee' | 'store-properties';

export const useDataSyncMutation = (options: UseMutationOptions<unknown, unknown, SyncType>) => {
  const fetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  return useMutation(['sync'], (type: SyncType) => fetch(`/api/${type}/sync`, { method: 'POST' }), {
    ...options,
    onSuccess(...args) {
      const [, syncType] = args;

      switch (syncType) {
        case 'store-properties':
          queryClient.invalidateQueries(['store-properties']);
          break;
      }

      options?.onSuccess?.(...args);
    },
  });
};
