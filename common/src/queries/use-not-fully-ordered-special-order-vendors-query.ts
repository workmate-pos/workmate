import type { FetchVendorsResponse } from '@web/controllers/api/vendors.js';
import { useQuery, UseQueryOptions } from 'react-query';
import { Fetch } from './fetch.js';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';

export const useNotFullyOrderedSpecialOrderVendorsQuery = (
  { fetch, locationId }: { fetch: Fetch; locationId: ID | null },
  options?: UseQueryOptions<Vendor[], unknown, Vendor[], (string | null)[]>,
) =>
  useQuery({
    ...options,
    queryKey: ['not-fully-ordered-special-order-vendors', locationId],
    queryFn: async () => {
      if (!locationId) {
        return [];
      }

      const response = await fetch(`/api/vendors/not-fully-ordered-special-orders/${parseGid(locationId).id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch vendors');
      }

      const { vendors }: FetchVendorsResponse = await response.json();
      return vendors;
    },
  });

export type Vendor = FetchVendorsResponse['vendors'][number];
