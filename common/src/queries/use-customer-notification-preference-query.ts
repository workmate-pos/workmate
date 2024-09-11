import { FetchCustomerNotificationPreferenceResponse } from '@web/controllers/api/customer.js';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useQuery, UseQueryOptions } from 'react-query';
import { Fetch } from './fetch.js';

export const useCustomerNotificationPreferenceQuery = (
  {
    fetch,
    customerId,
  }: {
    fetch: Fetch;
    customerId: ID | null;
  },
  options?: UseQueryOptions<string | null, unknown, string | null, (string | null)[]>,
) =>
  useQuery({
    ...options,
    queryKey: ['customer-notification-preference', customerId],
    queryFn: async () => {
      if (!customerId) {
        return null;
      }

      const response = await fetch(
        `/api/customer/${encodeURIComponent(parseGid(customerId).id)}/notification-preference`,
      );

      if (!response.ok) {
        throw new Error('Failed to fetch customer notification preference');
      }

      const { preference }: FetchCustomerNotificationPreferenceResponse = await response.json();
      return preference;
    },
  });
