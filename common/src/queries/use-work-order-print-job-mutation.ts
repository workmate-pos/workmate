import { Fetch } from './fetch.js';
import { useMutation } from 'react-query';
import { PrintWorkOrderResponse } from '@web/controllers/api/work-order.js';
import { WorkOrderPrintJob } from '@web/schemas/generated/work-order-print-job.js';

export function useWorkOrderPrintJobMutation({ fetch }: { fetch: Fetch }) {
  return useMutation({
    mutationFn: async ({
      workOrderName,
      templateName,
      date,
      dueDate,
    }: {
      workOrderName: string;
      templateName: string;
    } & WorkOrderPrintJob) => {
      const searchParams = new URLSearchParams({ date, dueDate });

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
