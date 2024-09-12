import type { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { BlockStack, Select } from '@shopify/polaris';
import { NotificationPreference } from '@web/services/customer-notification-preference/notification-preference.js';

export function NotificationSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: (settings: ShopSettings) => void;
}) {
  return (
    <BlockStack gap={'400'}>
      <Select
        label="Default Notification Type"
        name="preference"
        value={settings.defaultNotificationPreference}
        requiredIndicator
        options={[
          {
            label: 'Email',
            value: 'email' satisfies NotificationPreference,
          },
          {
            label: 'SMS',
            value: 'sms' satisfies NotificationPreference,
          },
        ]}
        onChange={defaultNotificationPreference => setSettings({ ...settings, defaultNotificationPreference })}
        helpText={
          'You can configure the preferred notification type on a global and per-customer basis. The global setting is' +
          " configured here. To configure per-customer notifications, navigate to the customer's page. Note that customer preferences override the global setting."
        }
      />
    </BlockStack>
  );
}
