import {
  reactExtension,
  useApi,
  AdminBlock,
  ProgressIndicator,
  InlineStack,
  Form,
  Select,
  Text,
  Link,
  BlockStack,
} from '@shopify/ui-extensions-react/admin';
import { isGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { QueryClientProvider, QueryClient } from '@work-orders/common/queries/react-query.js';
import { useCustomerNotificationPreferenceQuery } from '@work-orders/common/queries/use-customer-notification-preference-query.js';
import { useCustomerNotificationPreferenceMutation } from '@work-orders/common/queries/use-customer-notification-preference-mutation.js';
import { useState } from 'react';
import { NotificationPreference } from '@web/services/customer-notification-preference/notification-preference.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';

// The target used here must match the target used in the extension's toml file (./shopify.extension.toml)
const TARGET = 'admin.customer-details.block.render';

const queryClient = new QueryClient();

export default reactExtension(TARGET, () => (
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
));

function App() {
  const { data } = useApi(TARGET);

  const customerId = data.selected.map(customer => customer.id).filter(isGid)[0] ?? null;

  const customerPreferenceQuery = useCustomerNotificationPreferenceQuery(
    { fetch, customerId },
    {
      onSuccess(preference) {
        setPreference(preference);
      },
    },
  );
  const customerPreferenceMutation = useCustomerNotificationPreferenceMutation({ fetch });

  const [preference, setPreference] = useState<string | null>(null);

  return (
    <AdminBlock>
      {customerPreferenceQuery.isFetching && (
        <InlineStack blockAlignment="center" inlineAlignment="center">
          <ProgressIndicator size="small-100" />
        </InlineStack>
      )}

      {customerPreferenceQuery.isError && (
        <InlineStack blockAlignment="center" inlineAlignment="center">
          <Text fontWeight="bold">
            Failed to fetch customer notification preference:{' '}
            {extractErrorMessage(customerPreferenceQuery.error, 'unknown error')}
          </Text>
        </InlineStack>
      )}

      {customerPreferenceQuery.isSuccess && !!customerId && (
        <Form
          onSubmit={() =>
            customerPreferenceMutation.mutate({
              customerId,
              preference,
            })
          }
          onReset={() => setPreference(customerPreferenceQuery.data ?? null)}
        >
          <BlockStack gap="base">
            <Select
              label="Preferred Notification Type"
              name="preference"
              value={preference ?? 'no-preference'}
              required
              disabled={customerPreferenceMutation.isLoading || !customerPreferenceQuery.isSuccess}
              options={[
                {
                  label: 'No preference',
                  value: 'no-preference',
                },
                {
                  label: 'Email',
                  value: 'email' satisfies NotificationPreference,
                },
                {
                  label: 'SMS',
                  value: 'sms' satisfies NotificationPreference,
                },
              ]}
              onChange={value => setPreference(value === 'no-preference' ? null : value)}
            />
            {!preference && (
              <Text fontWeight="light">
                You have not selected a preferred notification type. This customer will receive notifications via the
                default notification method configured in <Link to={'/settings'}>WorkMate settings.</Link>
              </Text>
            )}
          </BlockStack>
        </Form>
      )}
    </AdminBlock>
  );
}
