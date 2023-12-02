import { useInfiniteQuery } from 'react-query';
import { useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { PaginatedResult, Product } from '@shopify/retail-ui-extensions/src/extension-api/types';

const PAGE_SIZE = 10;

export const useProductsQuery = ({ query = '' }: { query?: string }) => {
  const api = useExtensionApi<'pos.home.modal.render'>();
  return useInfiniteQuery({
    queryKey: ['products', query],
    queryFn: async ({ pageParam: afterCursor = undefined }): Promise<PaginatedResult<Product>> => {
      const page = await api.productSearch.searchProducts({
        first: PAGE_SIZE,
        sortType: 'ALPHABETICAL_A_TO_Z',
        // queryString: query || undefined,
        afterCursor,
      });

      // queryString appears bugged: it only returns the first variant. so manually filter instead
      return {
        ...page,
        items: page.items.filter(product => {
          return (
            !query ||
            product.title.toLowerCase().includes(query.toLowerCase()) ||
            product.description.toLowerCase().includes(query.toLowerCase()) ||
            product.variants.some(variant => variant.sku?.toLowerCase()?.includes(query.toLowerCase())) ||
            product.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
          );
        }),
      };
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
