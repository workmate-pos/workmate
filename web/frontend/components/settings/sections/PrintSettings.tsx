import type { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { BlockStack, TextField } from '@shopify/polaris';
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
      <PrintTemplateGroup settings={settings} setSettings={setSettings} templateType={'workOrderPrintTemplates'} />
      <PrintTemplateGroup settings={settings} setSettings={setSettings} templateType={'purchaseOrderPrintTemplates'} />
      <TextField
        label={'Print Email'}
        autoComplete={'off'}
        value={settings.printEmail}
        onChange={value => setSettings({ ...settings, printEmail: value })}
        helpText={'The email address that WorkMate will send print jobs to'}
      />
    </BlockStack>
  );
}
