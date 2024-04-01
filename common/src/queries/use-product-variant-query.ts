import { useQueries, useQuery, useQueryClient, UseQueryOptions } from 'react-query';
import type { ID } from '@web/services/gql/queries/generated/schema.js';
import { Fetch } from './fetch.js';
import type { FetchProductsByIdResponse } from '@web/controllers/api/product-variant.js';
import { BatcherFetchResult, useBatcher } from '../batcher/use-batcher.js';
import { UseQueryData } from './react-query.js';

const useProductVariantBatcher = (fetch: Fetch) =>
  useBatcher({
    name: 'product-variants',
    maxSize: 10,
    handler: async (ids: ID[]) => {
      if (ids.length === 0) {
        return [];
      }

      const searchParams = new URLSearchParams();

      for (const id of ids) {
        searchParams.append('ids', id);
      }

      const response = await fetch(`/api/product-variant/by-ids?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch product variants');
      }

      const results: FetchProductsByIdResponse = await response.json();
      return results.productVariants;
    },
  });

type BatchResult = BatcherFetchResult<typeof useProductVariantBatcher>;

export const useProductVariantQuery = (
  { fetch, id }: { fetch: Fetch; id: ID | null },
  options?: UseQueryOptions<BatchResult, unknown, BatchResult, (string | null)[]>,
) => {
  const queryClient = useQueryClient();
  const batcher = useProductVariantBatcher(fetch);
  return useQuery({
    ...options,
    queryKey: ['product-variant', id],
    queryFn: async () => {
      if (id === null) {
        return null;
      }

      const productVariant = await batcher.fetch(id);

      if (productVariant?.barcode) {
        queryClient.setQueryData(
          ['product-variant-by-barcode', productVariant.barcode],
          productVariant satisfies UseQueryData<typeof useProductVariantQuery>,
        );
      }

      return productVariant;
    },
  });
};

export const useProductVariantQueries = ({ fetch, ids }: { fetch: Fetch; ids: ID[] }) => {
  const batcher = useProductVariantBatcher(fetch);
  const queryClient = useQueryClient();
  const queries = useQueries(
    ids.map(id => ({
      queryKey: ['product-variant', id],
      queryFn: async () => {
        const productVariant = await batcher.fetch(id);

        if (productVariant?.barcode) {
          queryClient.setQueryData(
            ['product-variant-by-barcode', productVariant.barcode],
            productVariant satisfies UseQueryData<typeof useProductVariantQuery>,
          );
        }

        return productVariant;
      },
    })),
  );
  return Object.fromEntries(ids.map((id, i) => [id, queries[i]!]));
};
