import type { ShopSettings } from '@web/services/settings/schema.js';
import { BlockStack, TextField } from '@shopify/polaris';

export function EmailSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: (settings: ShopSettings) => void;
}) {
  return (
    <BlockStack gap="400">
      <TextField
        label={'From Title'}
        autoComplete={'off'}
        value={settings.printing.global.defaultFrom}
        onChange={defaultFrom =>
          setSettings({
            ...settings,
            printing: {
              ...settings.printing,
              global: {
                ...settings.printing.global,
                defaultFrom,
              },
            },
          })
        }
        helpText={'The name that will appear in the From field of emails sent from WorkMate'}
      />
      <TextField
        label={'Reply To'}
        autoComplete={'off'}
        value={settings.printing.global.defaultReplyTo}
        onChange={defaultReplyTo =>
          setSettings({
            ...settings,
            printing: {
              ...settings.printing,
              global: {
                ...settings.printing.global,
                defaultReplyTo,
              },
            },
          })
        }
        helpText={'The email address that will appear in the Reply-To field of emails sent from WorkMate'}
      />
    </BlockStack>
  );
}
