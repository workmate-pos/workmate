import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ReorderPointImportFileName } from '@web/services/reorder/csv-import.js';
import { Fetch } from './fetch.js';

export const useReorderPointsUploadCsvMutation = (
  { fetch }: { fetch: Fetch },
  { onSuccess }: { onSuccess?: () => void | Promise<void> } = {},
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (files: Record<ReorderPointImportFileName, File>) => {
      const formData = new FormData();

      const fileNames: ReorderPointImportFileName[] = ['reorder-points.csv'];

      for (const fileName of fileNames) {
        const file = files[fileName];
        if (file) {
          formData.append(fileName, file);
        }
      }

      const response = await fetch('/api/purchase-orders/reorder/upload/csv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload reorder points');
      }
    },
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ['reorder-plan'] });
      await onSuccess?.();
    },
  });
};
