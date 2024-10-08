import { ShopSettings } from '@web/services/settings/schema.js';
import { Dispatch, SetStateAction } from 'react';
import { BlockStack, Text, TextField } from '@shopify/polaris';

export function SpecialOrderSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: Dispatch<SetStateAction<ShopSettings>>;
}) {
  return (
    <BlockStack gap={'400'}>
      <TextField
        label="ID format"
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
        value={settings.specialOrders.idFormat}
        onChange={value =>
          setSettings({
            ...settings,
            specialOrders: {
              ...settings.specialOrders,
              idFormat: value,
            },
          })
        }
      />
    </BlockStack>
  );
}
