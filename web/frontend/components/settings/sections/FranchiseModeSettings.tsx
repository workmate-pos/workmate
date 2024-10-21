import { ShopSettings } from '@web/services/settings/schema.js';
import { BlockStack, Checkbox, Text } from '@shopify/polaris';

export function FranchiseModeSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: (settings: ShopSettings) => void;
}) {
  return (
    <BlockStack gap="400">
      <BlockStack gap="200">
        <Text as="h2" variant="headingMd" fontWeight="bold">
          Franchise mode
        </Text>
        <Text as="p" variant="bodyMd" tone="subdued">
          Franchise mode allows you to restrict locations on a per-employee basis. Employees will only be able to
          interact with locations that they have access to. This applies to all WorkMate features that require a
          location, including purchase orders, stock transfers, and work orders.
        </Text>
      </BlockStack>

      <BlockStack gap="200">
        <Checkbox
          label={'Enable franchise mode'}
          checked={settings.franchises.enabled}
          onChange={enabled => setSettings({ ...settings, franchises: { enabled } })}
        />
      </BlockStack>
    </BlockStack>
  );
}
