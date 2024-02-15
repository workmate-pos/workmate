import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import { Fetch } from './fetch.js';
import { CreateProduct } from '@web/schemas/generated/create-product.js';
import { CreateProductResponse } from '@web/controllers/api/products.js';
import { UseQueryData } from './react-query.js';
import { useProductVariantQuery } from './use-product-variant-query.js';

export const useCreateProductMutation = (
  { fetch }: { fetch: Fetch },
  options?: UseMutationOptions<CreateProductResponse, unknown, CreateProduct, unknown>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ['create-product'],
    mutationFn: async (body: CreateProduct) => {
      const response = await fetch('/api/products', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to create product');
      }

      const result: CreateProductResponse = await response.json();
      return result;
    },
    onSuccess: (...args) => {
      const [
        {
          product: { variant },
        },
      ] = args;

      queryClient.invalidateQueries(['products']);

      queryClient.setQueryData(
        ['product-variant', variant.id],
        variant satisfies UseQueryData<typeof useProductVariantQuery>,
      );

      options?.onSuccess?.(...args);
    },
  });
};
