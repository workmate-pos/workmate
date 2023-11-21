import { useInfiniteQuery } from 'react-query';
import { useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { PaginatedResult, Product } from '@shopify/retail-ui-extensions/src/extension-api/types';

const PAGE_SIZE = 1;

export const useProductsQuery = ({ query = '' }: { query?: string }) => {
  const api = useExtensionApi<'pos.home.modal.render'>();
  return useInfiniteQuery<PaginatedResult<Product>, unknown, Product>({
    queryKey: ['products', query],
    queryFn: async ({ pageParam: afterCursor = undefined }) => {
      const page = await api.productSearch.searchProducts({
        first: PAGE_SIZE,
        sortType: 'ALPHABETICAL_A_TO_Z',
        queryString: query || undefined,
        afterCursor,
      });

      return page;
    },
    getNextPageParam: lastPage => {
      if (!lastPage.hasNextPage) return undefined;
      return lastPage.lastCursor;
    },
    select: ({ pages, pageParams }) => {
      return {
        pages: pages.flatMap(page => page.items),
        pageParams,
      };
    },
    keepPreviousData: true,
  });
};
