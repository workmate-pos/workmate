import type { ShopSettings } from '@web/services/settings/schema.js';
import { BlockStack, Checkbox, TextField } from '@shopify/polaris';
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
      <PrintTemplateGroup settings={settings} setSettings={setSettings} templateType={'workOrders'} />
      <PrintTemplateGroup settings={settings} setSettings={setSettings} templateType={'purchaseOrders'} />

      <TextField
        label={'Default Print Email'}
        autoComplete={'off'}
        value={settings.printing.global.defaultEmail}
        onChange={defaultEmail =>
          setSettings({
            ...settings,
            printing: {
              ...settings.printing,
              global: {
                ...settings.printing.global,
                defaultEmail,
              },
            },
          })
        }
        helpText={'The email address that WorkMate will send print jobs to by default. Can be overridden.'}
      />

      <Checkbox
        label={'Allow custom print email'}
        checked={settings.printing.global.allowCustomEmail}
        onChange={allowCustomEmail =>
          setSettings({
            ...settings,
            printing: {
              ...settings.printing,
              global: { ...settings.printing.global, allowCustomEmail },
            },
          })
        }
        helpText={
          'Allow users to override the default print email address. Can be used to send printable documents to customers, etc.'
        }
      />
    </BlockStack>
  );
}
