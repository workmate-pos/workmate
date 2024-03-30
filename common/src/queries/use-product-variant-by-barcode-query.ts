import { useQuery, useQueryClient, UseQueryOptions } from 'react-query';
import { Fetch } from './fetch.js';
import type { FetchProductVariantResponse } from '@web/controllers/api/product-variant.js';
import { UseQueryData } from './react-query.js';
import { useProductVariantQuery } from './use-product-variant-query.js';

export const useProductVariantByBarcodeQuery = (
  { fetch, barcode }: { fetch: Fetch; barcode: string },
  options?: UseQueryOptions<
    FetchProductVariantResponse['productVariant'],
    unknown,
    FetchProductVariantResponse['productVariant'],
    string[]
  >,
) => {
  const queryClient = useQueryClient();

  return useQuery({
    ...options,
    queryKey: ['product-variant-by-barcode', barcode],
    queryFn: async () => {
      const response = await fetch(`/api/product-variant/barcode/${encodeURIComponent(barcode)}`);
      const { productVariant }: FetchProductVariantResponse = await response.json();

      return productVariant;
    },
    onSuccess(...args) {
      const [productVariant] = args;

      if (productVariant) {
        queryClient.setQueryData(
          ['product-variant', productVariant.id],
          productVariant satisfies UseQueryData<typeof useProductVariantQuery>,
        );
      }

      options?.onSuccess?.(...args);
    },
  });
};
