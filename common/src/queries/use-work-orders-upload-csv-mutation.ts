import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { WorkOrderImportFileName } from '@web/services/work-orders/csv-import.js';
import { Fetch } from './fetch.js';

export const useWorkOrdersUploadCsvMutation = (
  { fetch }: { fetch: Fetch },
  { onSuccess }: { onSuccess?: () => void } = {},
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      files: Pick<Record<WorkOrderImportFileName, File>, 'work-order-info.csv'> &
        Partial<Record<WorkOrderImportFileName, File | undefined>>,
    ) => {
      const formData = new FormData();

      const fileNames: WorkOrderImportFileName[] = [
        'work-order-info.csv',
        'work-order-custom-fields.csv',
        'work-order-line-items.csv',
        'work-order-line-item-custom-fields.csv',
        'work-order-charges.csv',
      ];

      for (const fileName of fileNames) {
        const file = files[fileName];
        if (file) {
          formData.append(fileName, file);
        }
      }

      const response = await fetch('/api/work-order/upload/csv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload work orders');
      }
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['work-order'] });
      queryClient.invalidateQueries({ queryKey: ['work-order-info'] });
      onSuccess?.();
    },
  });
};
