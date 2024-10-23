import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UpsertPurchaseOrderReceipt } from '@web/schemas/generated/upsert-purchase-order-receipt.js';
import { UseQueryData } from './react-query.js';
import { usePurchaseOrderQuery } from './use-purchase-order-query.js';
import { UpsertPurchaseOrderReceiptResponse } from '@web/controllers/api/purchase-orders.js';
import { Fetch } from './fetch.js';

export const usePurchaseOrderReceiptMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ purchaseOrderName, ...body }: UpsertPurchaseOrderReceipt & { purchaseOrderName: string }) => {
      const response = await fetch(`/api/purchase-orders/${encodeURIComponent(purchaseOrderName)}/receipts`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to create purchase order receipt');
      }

      const res: UpsertPurchaseOrderReceiptResponse = await response.json();
      return res.purchaseOrder;
    },
    async onSuccess(purchaseOrder) {
      queryClient.setQueryData(
        ['purchase-order', purchaseOrder.name],
        purchaseOrder satisfies UseQueryData<typeof usePurchaseOrderQuery>,
      );

      await queryClient.invalidateQueries({ queryKey: ['purchase-order-info'] });
    },
  });
};
