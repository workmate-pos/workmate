import { useQuery } from '@tanstack/react-query';
import { Fetch } from './fetch.js';
import { FetchCustomerMetafieldsResponse } from '@web/controllers/api/customer.js';

export const useCustomerMetafieldsQuery = ({ fetch }: { fetch: Fetch }) => {
  return useQuery({
    queryKey: ['customer-metafields'] as const,
    queryFn: async () => {
      const response = await fetch('/api/customer/metafields');

      if (!response.ok) {
        throw new Error('Failed to fetch customer metafields');
      }

      const results: FetchCustomerMetafieldsResponse = await response.json();
      return results.metafields;
    },
  });
};
