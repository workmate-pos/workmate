import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { mapSupplier, useSupplierQuery } from './use-supplier-query.js';
import { FetchSuppliersResponse } from '@web/controllers/api/suppliers.js';
import { UseQueryData } from './react-query.js';
import { Fetch } from './fetch.js';
import { SupplierPaginationOptions } from '@web/schemas/generated/supplier-pagination-options.js';

export const useSuppliersQuery = ({
  fetch,
  params,
}: {
  fetch: Fetch;
  params: Omit<SupplierPaginationOptions, 'offset'>;
}) => {
  const queryClient = useQueryClient();

  return useInfiniteQuery({
    queryKey: ['suppliers', params],
    queryFn: async ({ pageParam: offset }) => {
      const searchParams = new URLSearchParams();

      for (const [key, value] of Object.entries({ ...params, offset })) {
        if (value === undefined) continue;
        searchParams.set(key, String(value));
      }

      const response = await fetch(`/api/suppliers?${searchParams.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch suppliers');
      }

      const { suppliers, hasNextPage }: FetchSuppliersResponse = await response.json();

      const mappedSuppliers = suppliers.map(mapSupplier);

      for (const supplier of mappedSuppliers) {
        queryClient.setQueryData<UseQueryData<typeof useSupplierQuery>>(['supplier', supplier.id], supplier);
      }

      return {
        suppliers: mappedSuppliers,
        hasNextPage,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages, previousOffset) =>
      lastPage.hasNextPage ? previousOffset + lastPage.suppliers.length : undefined,
  });
};
