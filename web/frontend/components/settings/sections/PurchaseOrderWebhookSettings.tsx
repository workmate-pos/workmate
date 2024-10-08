import type { ShopSettings } from '@web/services/settings/schema.js';
import { Dispatch, SetStateAction } from 'react';
import { BlockStack, Checkbox, TextField } from '@shopify/polaris';

export function PurchaseOrderWebhookSettings({
  settings,
  setSettings,
  onIsValid,
}: {
  settings: ShopSettings;
  setSettings: Dispatch<SetStateAction<ShopSettings>>;
  onIsValid: (isValid: boolean) => void;
}) {
  function getErrorMessage(endpointUrl: string | undefined) {
    if (endpointUrl === undefined) {
      return undefined;
    }

    try {
      new URL(endpointUrl);
    } catch (error) {
      return 'Invalid URL';
    }

    return undefined;
  }

  return (
    <BlockStack gap="400">
      <Checkbox
        label={'Enable purchase order webhook order requests'}
        checked={settings.purchaseOrders.webhook.enabled}
        onChange={enabled => {
          setSettings({
            ...settings,
            purchaseOrders: {
              ...settings.purchaseOrders,
              webhook: enabled ? { enabled, endpointUrl: '' } : { enabled },
            },
          });
          onIsValid(!enabled);
        }}
      />
      {settings.purchaseOrders.webhook.enabled && (
        <TextField
          label={'Webhook Endpoint URL'}
          autoComplete="off"
          value={settings.purchaseOrders.webhook.endpointUrl ?? ''}
          disabled={settings.purchaseOrders.webhook.endpointUrl === null}
          onChange={value => {
            setSettings({
              ...settings,
              purchaseOrders: {
                ...settings.purchaseOrders,
                webhook: {
                  enabled: true,
                  endpointUrl: value,
                },
              },
            });
            onIsValid(getErrorMessage(value) === undefined);
          }}
          error={getErrorMessage(settings.purchaseOrders.webhook.endpointUrl)}
        />
      )}
    </BlockStack>
  );
}
