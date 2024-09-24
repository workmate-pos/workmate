import { Fetch } from './fetch.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useSyncProductMetafieldsMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/metafields/sync/products', { method: 'POST' });

      if (!response.ok) {
        throw new Error('Failed to sync product metafields');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sync-product-metafields-task'] });
    },
  });
};
