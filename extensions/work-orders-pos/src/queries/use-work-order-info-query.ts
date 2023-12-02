import { useInfiniteQuery } from 'react-query';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import type { FetchWorkOrderInfoPageResponse } from '@web/controllers/api/work-order';

const PAGE_SIZE = 10;

export const useWorkOrderInfoQuery = ({ query = '' }: { query?: string }) => {
  const fetch = useAuthenticatedFetch();

  return useInfiniteQuery({
    queryKey: ['work-order-info', query],
    queryFn: async ({ pageParam: offset = 0 }): Promise<FetchWorkOrderInfoPageResponse> => {
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
    select: ({ pages, pageParams }) => ({
      pages: pages.flatMap(page => page.infoPage),
      pageParams,
    }),
    keepPreviousData: true,
  });
};

export type WorkOrderInfo = FetchWorkOrderInfoPageResponse['infoPage'][number];
