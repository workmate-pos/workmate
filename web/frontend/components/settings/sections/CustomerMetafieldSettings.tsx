import { ShopSettings } from '@web/services/settings/schema.js';
import { Dispatch, SetStateAction } from 'react';
import { useCustomerMetafieldsQuery } from '@work-orders/common/queries/use-customer-metafields-query.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { BlockStack, Checkbox, InlineGrid, Label, SkeletonBodyText, Text } from '@shopify/polaris';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';

export function CustomerMetafieldSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: Dispatch<SetStateAction<ShopSettings>>;
}) {
  const [toast, setToastAction] = useToast();

  const fetch = useAuthenticatedFetch({ setToastAction });
  const customerMetafieldsQuery = useCustomerMetafieldsQuery({ fetch });

  const customerMetafields = customerMetafieldsQuery.data ?? [];

  return (
    <BlockStack gap={'400'}>
      <Label id={'selected-metafields'}>Displayed Customer Metafields</Label>

      {customerMetafieldsQuery.isError && (
        <Text as="p" tone={'critical'}>
          {extractErrorMessage(customerMetafieldsQuery.error, 'An error occurred while loading customer metafields')}
        </Text>
      )}

      <InlineGrid gap={'400'} columns={2}>
        {customerMetafieldsQuery.isLoading && <SkeletonBodyText />}

        {customerMetafields.map(metafield => {
          const metafieldNamespaceKey = `${metafield.namespace}.${metafield.key}`;

          return (
            <Checkbox
              key={metafieldNamespaceKey}
              label={metafield.name}
              value={metafieldNamespaceKey}
              checked={settings.vendorCustomerMetafieldsToShow.includes(metafieldNamespaceKey)}
              onChange={checked => {
                if (checked) {
                  setSettings(settings => ({
                    ...settings,
                    vendorCustomerMetafieldsToShow: [...settings.vendorCustomerMetafieldsToShow, metafieldNamespaceKey],
                  }));
                } else {
                  setSettings(settings => ({
                    ...settings,
                    vendorCustomerMetafieldsToShow: settings.vendorCustomerMetafieldsToShow.filter(
                      v => v !== metafieldNamespaceKey,
                    ),
                  }));
                }
              }}
            />
          );
        })}
      </InlineGrid>

      {toast}
    </BlockStack>
  );
}
