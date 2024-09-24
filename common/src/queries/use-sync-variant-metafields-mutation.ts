import { Fetch } from './fetch.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useSyncVariantMetafieldsMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/metafields/sync/variants', { method: 'POST' });

      if (!response.ok) {
        throw new Error('Failed to sync product variant metafields');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sync-variant-metafields-task'] });
    },
  });
};
