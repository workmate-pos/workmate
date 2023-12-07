import { useInfiniteQuery } from 'react-query';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import type { FetchProductsResponse } from '@web/controllers/api/product-variant';

export const useProductVariantsQuery = ({ query = '' }: { query?: string }) => {
  const fetch = useAuthenticatedFetch();
  return useInfiniteQuery({
    queryKey: ['products', query],
    queryFn: async ({ pageParam: after }): Promise<FetchProductsResponse> => {
      const searchParams = new URLSearchParams();
      if (query) searchParams.set('query', query);
      if (after) searchParams.set('after', after);

      const response = await fetch(`/api/product-variant?${searchParams}`);

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
  });
};

export type ProductVariant = FetchProductsResponse['productVariants'][number];
