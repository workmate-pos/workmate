import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { PurchaseOrderImportFileName } from '@web/services/purchase-orders/csv-import.js';
import { Fetch } from './fetch.js';

export const usePurchaseOrdersUploadCsvMutation = (
  { fetch }: { fetch: Fetch },
  { onSuccess }: { onSuccess?: () => void } = {},
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      files: Pick<Record<PurchaseOrderImportFileName, File>, 'purchase-order-info.csv'> &
        Partial<Record<PurchaseOrderImportFileName, File | undefined>>,
    ) => {
      const formData = new FormData();

      const fileNames: PurchaseOrderImportFileName[] = [
        'purchase-order-info.csv',
        'custom-fields.csv',
        'employee-assignments.csv',
        'line-items.csv',
        'line-item-custom-fields.csv',
      ];

      for (const fileName of fileNames) {
        const file = files[fileName];
        if (file) {
          formData.append(fileName, file);
        }
      }

      const response = await fetch('/api/purchase-orders/upload/csv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload purchase orders');
      }
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order-info'] });
      onSuccess?.();
    },
  });
};
