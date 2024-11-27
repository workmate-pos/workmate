import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Fetch } from './fetch.js';

export const useDeleteSupplierMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/suppliers/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete supplier');
      }
    },
    async onSuccess(id) {
      await queryClient.invalidateQueries({ queryKey: ['supplier', id] });
    },
  });
};
