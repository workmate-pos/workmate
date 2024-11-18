import { skipToken, useQuery } from '@tanstack/react-query';
import { Fetch } from './fetch.js';
import { FetchSupplierResponse } from '@web/controllers/api/suppliers.js';
import { NestedDateToDateTime } from '@web/util/types.js';
import { Supplier } from '@web/services/suppliers/queries.js';

export const useSupplierQuery = ({ fetch, id }: { fetch: Fetch; id: number | null }) =>
  useQuery({
    queryKey: ['supplier', id],
    queryFn:
      id === null
        ? skipToken
        : async () => {
            const response = await fetch(`/api/suppliers/${encodeURIComponent(id)}`);

            if (!response.ok) {
              throw new Error('Failed to fetch supplier');
            }

            const supplier: FetchSupplierResponse = await response.json();
            return mapSupplier(supplier);
          },
  });

export function mapSupplier(supplier: NestedDateToDateTime<Supplier>): Supplier {
  return {
    ...supplier,
    createdAt: new Date(supplier.createdAt),
    updatedAt: new Date(supplier.updatedAt),
  };
}
