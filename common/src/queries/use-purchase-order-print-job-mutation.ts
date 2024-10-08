import { Fetch } from './fetch.js';
import { useMutation } from '@tanstack/react-query';
import { PrintPurchaseOrderResponse } from '@web/controllers/api/purchase-orders.js';
import { PurchaseOrderPrintJob } from '@web/schemas/generated/purchase-order-print-job.js';

export function usePurchaseOrderPrintJobMutation({ fetch }: { fetch: Fetch }) {
  return useMutation({
    mutationFn: async ({
      purchaseOrderName,
      templateName,
      ...qs
    }: {
      purchaseOrderName: string;
      templateName: string;
    } & PurchaseOrderPrintJob) => {
      const searchParams = new URLSearchParams(qs);

      const response = await fetch(
        `/api/purchase-orders/${encodeURIComponent(purchaseOrderName)}/print/${encodeURIComponent(templateName)}?${searchParams}`,
        {
          method: 'POST',
        },
      );

      if (!response.ok) {
        throw new Error('Failed to print purchase order');
      }

      const body: PrintPurchaseOrderResponse = await response.json();
      return body;
    },
  });
}
