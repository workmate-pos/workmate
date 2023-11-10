import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import { useQuery } from 'react-query';

// TODO: status filter
export const useWorkOrderInfoPageQuery = ({
  lastWorkOrderName,
  enabled = true,
}: {
  lastWorkOrderName?: string;
  enabled?: boolean;
}) => {
  const fetch = useAuthenticatedFetch();

  const query = useQuery(
    ['work-order-page-items', lastWorkOrderName],
    async (): Promise<{ workOrders: WorkOrderInfo[] } | null> => {
      const searchParams = new URLSearchParams({
        limit: '25',
      });
      if (lastWorkOrderName) searchParams.set('fromName', lastWorkOrderName);
      const response = await fetch(`/api/work-order?${searchParams}`);

      if (!response.ok) {
        return null;
      }

      return response.json();
    },
    { enabled },
  );

  return query;
};

export type WorkOrderInfo = {
  name: string;
  status: string;
  discountAmount: number;
  depositAmount: number;
  dueDate: string;
  taxAmount: number;
  products: {
    unitPrice: number;
    quantity: number;
  }[];
};
