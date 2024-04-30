import type { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { BlockStack, Box, Card, Text, TextField } from '@shopify/polaris';

export function EmailSettings({
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
            Email Settings
          </Text>
        </BlockStack>
      </Box>
      <Card roundedAbove="sm">
        <BlockStack gap="400">
          <TextField
            label={'From Title'}
            autoComplete={'off'}
            value={settings.emailFromTitle}
            onChange={value => setSettings({ ...settings, emailFromTitle: value })}
            helpText={'The name that will appear in the From field of emails sent from WorkMate'}
          />
          <TextField
            label={'Reply To'}
            autoComplete={'off'}
            value={settings.emailReplyTo}
            onChange={value => setSettings({ ...settings, emailReplyTo: value })}
            helpText={'The email address that will appear in the Reply-To field of emails sent from WorkMate'}
          />
        </BlockStack>
      </Card>
    </>
  );
}
