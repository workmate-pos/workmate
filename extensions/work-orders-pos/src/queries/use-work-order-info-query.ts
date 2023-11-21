import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import { useInfiniteQuery } from 'react-query';

const PAGE_SIZE = 25;

export const useWorkOrderInfoQuery = ({ query = '' }: { query?: string }) => {
  const fetch = useAuthenticatedFetch();

  return useInfiniteQuery<{ infoPage: WorkOrderInfo[] }, unknown, WorkOrderInfo>({
    queryKey: ['work-order-info', query],
    queryFn: async ({ pageParam: offset = 0 }) => {
      const searchParams = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (query) searchParams.set('query', query);
      const response = await fetch(`/api/work-order?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch work order info');
      }

      return await response.json();
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.infoPage.length < PAGE_SIZE) return undefined;
      return pages.map(page => page.infoPage.length).reduce((acc, curr) => acc + curr, 0);
    },
    select: data => ({
      pages: data.pages.flatMap(page => page.infoPage),
      pageParams: data.pageParams,
    }),
  });
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
