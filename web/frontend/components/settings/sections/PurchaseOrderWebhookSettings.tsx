import type { ShopSettings } from '@web/schemas/generated/shop-settings.js';
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
  function getErrorMessage(endpointUrl: string | null) {
    if (endpointUrl === null) {
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
        checked={settings.purchaseOrderWebhook.endpointUrl !== null}
        onChange={enabled => {
          setSettings({
            ...settings,
            purchaseOrderWebhook: {
              endpointUrl: enabled ? '' : null,
            },
          });
          onIsValid(!enabled);
        }}
      />
      <TextField
        label={'Webhook Endpoint URL'}
        autoComplete="off"
        value={settings.purchaseOrderWebhook.endpointUrl ?? ''}
        disabled={settings.purchaseOrderWebhook.endpointUrl === null}
        onChange={value => {
          setSettings({
            ...settings,
            purchaseOrderWebhook: {
              endpointUrl: value,
            },
          });
          onIsValid(getErrorMessage(value) === undefined);
        }}
        error={getErrorMessage(settings.purchaseOrderWebhook.endpointUrl)}
      />
    </BlockStack>
  );
}
