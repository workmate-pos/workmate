import type { ShopSettings } from '@web/services/settings/schema.js';
import { BlockStack, Checkbox, Text, TextField } from '@shopify/polaris';
import { PrintTemplateGroup } from '@web/frontend/components/settings/PrintTemplateGroup.js';

export function PrintSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: (settings: ShopSettings) => void;
}) {
  // one part for purchase order print templates, and one for work order print templates. subject should be text field and template text area

  return (
    <BlockStack gap="400">
      <Text as="h2" variant="headingLg" fontWeight="bold">
        Print templates
      </Text>

      <PrintTemplateGroup settings={settings} setSettings={setSettings} templateType={'workOrders'} />
      <PrintTemplateGroup settings={settings} setSettings={setSettings} templateType={'purchaseOrders'} />
    </BlockStack>
  );
}
