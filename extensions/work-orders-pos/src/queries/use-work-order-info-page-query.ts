import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import { useQuery } from 'react-query';

export const useWorkOrderPageQuery = (lastWorkOrderName?: string) => {
  const fetch = useAuthenticatedFetch();

  const query = useQuery(['work-order-page-items', lastWorkOrderName], (): Promise<{ workOrders: WorkOrderInfo[] }> => {
    const searchParams = new URLSearchParams({});
    if (lastWorkOrderName) searchParams.set('fromName', lastWorkOrderName);
    return fetch(`/api/work-order?${searchParams}`).then(res => res.json());
  });

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
