import type { FetchVendorsResponse } from '@web/controllers/api/vendors.js';
import { useQuery, UseQueryOptions } from 'react-query';
import { Fetch } from './fetch.js';
import { VendorFilter } from '@web/schemas/generated/get-vendors-filters.js';

export const useVendorsQuery = (
  { fetch, filters }: { fetch: Fetch; filters?: VendorFilter },
  options?: UseQueryOptions<Vendor[], unknown, Vendor[], (string | VendorFilter | undefined)[]>,
) =>
  useQuery({
    ...options,
    queryKey: ['vendors', filters],
    queryFn: async () => {
      const searchParams = new URLSearchParams();

      for (const [key, value] of Object.entries(filters ?? {})) {
        if (value === undefined) continue;
        searchParams.set(key, String(value));
      }

      const response = await fetch(`/api/vendors?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch vendors');
      }

      const { vendors }: FetchVendorsResponse = await response.json();
      return vendors;
    },
  });

export type Vendor = FetchVendorsResponse['vendors'][number];
