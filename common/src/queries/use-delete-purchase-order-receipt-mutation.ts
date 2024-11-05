import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UpsertPurchaseOrderReceipt } from '@web/schemas/generated/upsert-purchase-order-receipt.js';
import { UseQueryData } from './react-query.js';
import { usePurchaseOrderQuery } from './use-purchase-order-query.js';
import {
  DeletePurchaseOrderReceiptResponse,
  UpsertPurchaseOrderReceiptResponse,
} from '@web/controllers/api/purchase-orders.js';
import { Fetch } from './fetch.js';

export const useDeletePurchaseOrderReceiptMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ purchaseOrderName, receiptName }: { receiptName: string; purchaseOrderName: string }) => {
      const response = await fetch(
        `/api/purchase-orders/${encodeURIComponent(purchaseOrderName)}/receipts/${encodeURIComponent(receiptName)}`,
        { method: 'DELETE' },
      );

      if (!response.ok) {
        throw new Error('Failed to delete purchase order receipt');
      }

      const res: DeletePurchaseOrderReceiptResponse = await response.json();
      return res.purchaseOrder;
    },
    async onSuccess(purchaseOrder) {
      await queryClient.invalidateQueries({ queryKey: ['purchase-order-info'] });

      queryClient.setQueryData(
        ['purchase-order', purchaseOrder.name],
        purchaseOrder satisfies UseQueryData<typeof usePurchaseOrderQuery>,
      );
    },
  });
};
