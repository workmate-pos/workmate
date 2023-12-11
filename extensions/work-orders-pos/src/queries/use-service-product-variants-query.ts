import { useInfiniteQuery } from 'react-query';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import type { FetchServiceProductVariantsResponse } from '@web/controllers/api/service-product-variant';

export const useServiceProductVariants = () => {
  const fetch = useAuthenticatedFetch();

  const serviceProductVariantsQuery = useInfiniteQuery({
    queryKey: ['service-products'],
    queryFn: async ({ pageParam: after }): Promise<FetchServiceProductVariantsResponse> => {
      const searchParams = new URLSearchParams();
      if (after) searchParams.set('after', after);

      const response = await fetch(`/api/service-product-variant?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      return await response.json();
    },
    getNextPageParam: lastPage => {
      if (!lastPage.pageInfo.hasNextPage) return undefined;
      return lastPage.pageInfo.endCursor;
    },
    select: ({ pages, pageParams }) => ({
      pages: pages.flatMap(page => page.productVariants),
      pageParams,
    }),
    keepPreviousData: true,
    onSuccess() {
      // collection product variants does not support `query`, so we need to fetch everything to make query work
      if (serviceProductVariantsQuery.hasNextPage) {
        serviceProductVariantsQuery.fetchNextPage();
      }
    },
  });

  return serviceProductVariantsQuery;
};
