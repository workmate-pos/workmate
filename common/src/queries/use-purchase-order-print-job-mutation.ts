import { Fetch } from './fetch.js';
import { useMutation } from 'react-query';
import { PrintPurchaseOrderResponse } from '@web/controllers/api/purchase-orders.js';

export function usePurchaseOrderPrintJobMutation({ fetch }: { fetch: Fetch }) {
  return useMutation({
    mutationFn: async ({
      purchaseOrderName,
      templateName,
      date,
    }: {
      purchaseOrderName: string;
      templateName: string;
      date: string;
    }) => {
      const searchParams = new URLSearchParams({ date });

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
