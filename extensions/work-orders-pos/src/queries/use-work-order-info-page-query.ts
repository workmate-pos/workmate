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
    async (): Promise<{ infoPage: WorkOrderInfo[] } | null> => {
      const searchParams = new URLSearchParams({
        limit: '25',
      });
      if (lastWorkOrderName) searchParams.set('fromName', lastWorkOrderName);
      const response = await fetch(`/api/work-order?${searchParams}`);

      if (!response.ok) {
        return null;
      }

      return await response.json();
    },
    { enabled },
  );

  return query;
};

export type WorkOrderInfo = {
  name: string;
  status: string;
  depositAmount: number;
  taxAmount: number;
  discountAmount: number;
  shippingAmount: number;
  productAmount: number;
  dueDate: string;
};
