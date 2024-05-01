import { Fetch } from './fetch.js';
import { useMutation } from 'react-query';
import { PrintWorkOrderResponse } from '@web/controllers/api/work-order.js';

export function useWorkOrderPrintJobMutation({ fetch }: { fetch: Fetch }) {
  return useMutation({
    mutationFn: async ({
      workOrderName,
      templateName,
      date,
    }: {
      workOrderName: string;
      templateName: string;
      date: string;
    }) => {
      const searchParams = new URLSearchParams({ date });

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
