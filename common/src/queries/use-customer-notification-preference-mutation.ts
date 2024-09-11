import { UpdateCustomerNotificationPreferenceResponse } from '@web/controllers/api/customer.js';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useMutation, useQueryClient } from 'react-query';
import { Fetch } from './fetch.js';
import { UpdateCustomerNotificationPreference } from '@web/schemas/generated/update-customer-notification-preference.js';
import { UseQueryData } from './react-query.js';
import { useCustomerNotificationPreferenceQuery } from './use-customer-notification-preference-query.js';

export const useCustomerNotificationPreferenceMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, ...body }: { customerId: ID } & UpdateCustomerNotificationPreference) => {
      const response = await fetch(
        `/api/customer/${encodeURIComponent(parseGid(customerId).id)}/notification-preference`,
        {
          method: 'POST',
          body: JSON.stringify(body),
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch customer notification preference');
      }

      const { success }: UpdateCustomerNotificationPreferenceResponse = await response.json();
      return success;
    },
    onSuccess(_, body) {
      queryClient.setQueryData(
        ['customer-notification-preference', body.customerId],
        body.preference satisfies UseQueryData<typeof useCustomerNotificationPreferenceQuery>,
      );
    },
  });
};
