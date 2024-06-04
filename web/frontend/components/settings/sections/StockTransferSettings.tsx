import { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { Dispatch, SetStateAction } from 'react';
import { BlockStack, Text, TextField } from '@shopify/polaris';

export function StockTransferSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: Dispatch<SetStateAction<ShopSettings>>;
}) {
  return (
    <BlockStack gap={'400'}>
      <TextField
        label="ID Format"
        autoComplete="off"
        requiredIndicator
        helpText={
          <>
            You can use variables by surrounding them in curly braces.
            <br />
            Available variables:{' '}
            <Text as="p" fontWeight="semibold">
              {'{{id}}, {{year}}, {{month}}, {{day}}, {{hour}}, {{minute}}'}
            </Text>
          </>
        }
        value={settings.stockTransferIdFormat}
        onChange={value =>
          setSettings({
            ...settings,
            stockTransferIdFormat: value,
          })
        }
      />
    </BlockStack>
  );
}
