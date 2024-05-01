import type { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { BlockStack, Box, Card, Checkbox, Text, TextField } from '@shopify/polaris';

export function LabourSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: (settings: ShopSettings) => void;
}) {
  return (
    <>
      <Box as="section" paddingInlineStart={{ xs: '400', sm: '0' }} paddingInlineEnd={{ xs: '400', sm: '0' }}>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Labour
          </Text>
        </BlockStack>
      </Box>
      <Card roundedAbove="sm">
        <BlockStack gap="400">
          <TextField
            label={'Default Labour Line Item Name'}
            autoComplete={'off'}
            value={settings.labourLineItemName}
            onChange={value => setSettings({ ...settings, labourLineItemName: value })}
          />
          <TextField
            label={'Labour Line Item SKU'}
            autoComplete={'off'}
            value={settings.labourLineItemSKU}
            onChange={value => setSettings({ ...settings, labourLineItemSKU: value })}
          />
          <BlockStack>
            <Text as={'p'}>Enabled Labour Options</Text>
            <Checkbox
              label={'Employee Assignments'}
              checked={settings.chargeSettings.employeeAssignments}
              onChange={enabled =>
                setSettings({
                  ...settings,
                  chargeSettings: { ...settings.chargeSettings, employeeAssignments: enabled },
                })
              }
            />
            <Checkbox
              label={'Hourly Labour'}
              checked={settings.chargeSettings.hourlyLabour}
              onChange={enabled =>
                setSettings({
                  ...settings,
                  chargeSettings: { ...settings.chargeSettings, hourlyLabour: enabled },
                })
              }
            />
            <Checkbox
              label={'Fixed-Price Labour'}
              checked={settings.chargeSettings.fixedPriceLabour}
              onChange={enabled =>
                setSettings({
                  ...settings,
                  chargeSettings: { ...settings.chargeSettings, fixedPriceLabour: enabled },
                })
              }
            />
          </BlockStack>
        </BlockStack>
      </Card>
    </>
  );
}
