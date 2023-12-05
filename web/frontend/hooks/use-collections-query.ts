import { useInfiniteQuery } from 'react-query';
import { useAuthenticatedFetch } from '@teifi-digital/shopify-app-react';
import type { FetchCollectionsResponse } from '../../controllers/api/collection';

export const useCollectionsQuery = ({ query = '' }: { query?: string }) => {
  const fetch = useAuthenticatedFetch();
  return useInfiniteQuery({
    queryKey: ['collections', query],
    queryFn: async ({ pageParam: after }): Promise<FetchCollectionsResponse> => {
      const searchParams = new URLSearchParams();
      if (query) searchParams.set('query', query);
      if (after) searchParams.set('after', after);

      const response = await fetch(`/api/collection?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch collections');
      }

      return await response.json();
    },
    select: ({ pages, pageParams }) => ({
      pages: pages.flatMap(page => page.collections),
      pageParams,
    }),
    getNextPageParam: lastPage => {
      if (!lastPage.pageInfo.hasNextPage) return undefined;
      return lastPage.pageInfo.endCursor;
    },
  });
};
