import { Fetch } from './fetch.js';
import { useMutation } from '@tanstack/react-query';
import { PrintWorkOrderResponse } from '@web/controllers/api/work-order.js';
import { WorkOrderPrintJob } from '@web/schemas/generated/work-order-print-job.js';

export function useWorkOrderPrintJobMutation({ fetch }: { fetch: Fetch }) {
  return useMutation({
    mutationFn: async ({
      workOrderName,
      templateName,
      ...qs
    }: {
      workOrderName: string;
      templateName: string;
    } & WorkOrderPrintJob) => {
      const searchParams = new URLSearchParams();

      for (const [key, value] of Object.entries(qs)) {
        if (value) {
          searchParams.set(key, value);
        }
      }

      const response = await fetch(
        `/api/work-order/${encodeURIComponent(workOrderName)}/print/${encodeURIComponent(templateName)}?${searchParams}`,
        { method: 'POST' },
      );

      if (!response.ok) {
        throw new Error('Failed to print work order');
      }

      const body: PrintWorkOrderResponse = await response.json();
      return body;
    },
  });
}
