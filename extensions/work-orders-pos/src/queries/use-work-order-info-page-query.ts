import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import { useQuery } from 'react-query';

const PAGE_SIZE = 25;

// TODO: status filter
export const useWorkOrderInfoPageQuery = ({
  offset = 0,
  enabled = true,
  query = '',
}: {
  offset?: number;
  enabled?: boolean;
  query?: string;
}) => {
  const fetch = useAuthenticatedFetch();

  return useQuery(
    ['work-order-page-items', query, offset],
    async (): Promise<{ infoPage: WorkOrderInfo[] } | null> => {
      const searchParams = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (query) searchParams.set('query', query);
      const response = await fetch(`/api/work-order?${searchParams}`);

      if (!response.ok) {
        return null;
      }

      return await response.json();
    },
    {
      enabled,
    },
  );
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
