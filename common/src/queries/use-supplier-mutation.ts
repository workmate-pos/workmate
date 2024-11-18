import { Fetch } from './fetch.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateSupplier } from '@web/schemas/generated/create-supplier.js';
import { UpsertSupplierResponse } from '@web/controllers/api/suppliers.js';
import { mapSupplier, useSupplierQuery } from './use-supplier-query.js';
import { UseQueryData } from './react-query.js';

export const useSupplierMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...createSupplier }: CreateSupplier & { id: number | null }) => {
      const response = await fetch(`/api/suppliers/${encodeURIComponent(id ?? '')}`, {
        method: 'POST',
        body: JSON.stringify(createSupplier),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to create supplier');
      }

      const result: UpsertSupplierResponse = await response.json();

      const supplier = mapSupplier(result);

      queryClient.setQueryData<UseQueryData<typeof useSupplierQuery>>(['supplier', supplier.id], supplier);

      return supplier;
    },
  });
};
