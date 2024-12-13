import type { FetchProductsResponse } from '@web/controllers/api/product-variant.js';
import type { PaginationOptions } from '@web/schemas/generated/pagination-options.js';
import { createPaginatedQuery } from './create-paginated-query.js';
import { useQueryClient } from '@tanstack/react-query';
import { UseQueryData } from './react-query.js';
import { useProductVariantQuery } from './use-product-variant-query.js';

const query = createPaginatedQuery({
  endpoint: '/api/product-variant',
  queryKeyFn: ({ query }: PaginationOptions) => ['products', query],
  extractPage: (response: FetchProductsResponse) => response.productVariants,
  cursorParamName: 'after',
});

// TODO: Integrate this with createPaginatedQuery (just provide the key name and the expected type)
export const useProductVariantsQuery = (...[options, ...args]: Parameters<typeof query>) => {
  const queryClient = useQueryClient();

  return query(
    {
      ...options,
      options: {
        ...options.options,
        onSuccess: page => {
          for (const productVariant of page.productVariants) {
            queryClient.setQueryData(
              ['product-variant', productVariant.id],
              productVariant satisfies UseQueryData<typeof useProductVariantQuery>,
            );
          }
        },
      },
    },
    ...args,
  );
};

export type ProductVariant = FetchProductsResponse['productVariants'][number];
