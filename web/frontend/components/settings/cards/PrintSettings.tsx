import type { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { BlockStack, Box, Card, Text, TextField } from '@shopify/polaris';
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
    <>
      <Box as="section" paddingInlineStart={{ xs: '400', sm: '0' }} paddingInlineEnd={{ xs: '400', sm: '0' }}>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Print Settings
          </Text>
        </BlockStack>
      </Box>
      <BlockStack gap="400">
        <Card roundedAbove="sm">
          <BlockStack gap="400">
            <TextField
              label={'Print Email'}
              autoComplete={'off'}
              value={settings.printEmail}
              onChange={value => setSettings({ ...settings, printEmail: value })}
              helpText={'The email address that WorkMate will send print jobs to'}
            />
          </BlockStack>
        </Card>
        <PrintTemplateGroup settings={settings} setSettings={setSettings} templateType={'workOrderPrintTemplates'} />
        <PrintTemplateGroup
          settings={settings}
          setSettings={setSettings}
          templateType={'purchaseOrderPrintTemplates'}
        />
      </BlockStack>
    </>
  );
}
