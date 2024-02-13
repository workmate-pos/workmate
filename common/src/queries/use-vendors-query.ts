import type { FetchVendorsResponse } from '@web/controllers/api/vendors.js';
import { useQuery, UseQueryOptions } from 'react-query';
import { Fetch } from './fetch.js';

export const useVendorsQuery = (
  { fetch }: { fetch: Fetch },
  options?: UseQueryOptions<Vendor[], unknown, Vendor[], string[]>,
) =>
  useQuery({
    ...options,
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await fetch('/api/vendors');

      if (!response.ok) {
        throw new Error('Failed to fetch vendors');
      }

      const { vendors }: FetchVendorsResponse = await response.json();
      return vendors;
    },
  });

export type Vendor = FetchVendorsResponse['vendors'][number];
