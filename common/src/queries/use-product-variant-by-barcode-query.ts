import { useQueries, useQuery, useQueryClient, UseQueryOptions } from 'react-query';
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
      const productVariant = await fetchProductVariantByBarcode(fetch, barcode);

      if (productVariant) {
        queryClient.setQueryData(
          ['product-variant', productVariant.id],
          productVariant satisfies UseQueryData<typeof useProductVariantQuery>,
        );
      }

      return productVariant;
    },
  });
};

export const useProductVariantByBarcodeQueries = (
  { fetch, barcodes }: { fetch: Fetch; barcodes: string[] },
  options?: UseQueryOptions<
    FetchProductVariantResponse['productVariant'],
    unknown,
    FetchProductVariantResponse['productVariant'],
    string[]
  >,
) => {
  const queryClient = useQueryClient();

  const queries = useQueries(
    barcodes.map(barcode => ({
      ...options,
      queryKey: ['product-variant-by-barcode', barcode],
      queryFn: async () => {
        const productVariant = await fetchProductVariantByBarcode(fetch, barcode);

        if (productVariant) {
          queryClient.setQueryData(
            ['product-variant', productVariant.id],
            productVariant satisfies UseQueryData<typeof useProductVariantQuery>,
          );
        }

        return productVariant;
      },
    })),
  );

  return Object.fromEntries(barcodes.map((barcode, i) => [barcode, queries[i]!]));
};

async function fetchProductVariantByBarcode(fetch: Fetch, barcode: string) {
  const response = await fetch(`/api/product-variant/barcode/${encodeURIComponent(barcode)}`);

  let productVariant: FetchProductVariantResponse['productVariant'] | null = null;

  if (response.ok) {
    ({ productVariant } = await response.json());
  } else if (response.status !== 404) {
    throw new Error('Error fetching product variant by barcode');
  }

  return productVariant;
}
