import { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { useState } from 'react';
import { BlockStack, Button, InlineStack, Text } from '@shopify/polaris';
import { NotificationSettingsNotificationCard } from '@web/frontend/components/notifications/NotificationSettingsNotificationCard.js';

type Notification = NonNullable<ShopSettings['specialOrders']['notifications']>[number];

export function SpecialOrderNotificationSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: (settings: ShopSettings) => void;
}) {
  const [wipNotification, setWipNotification] = useState<Notification>();

  const notifications = settings.specialOrders.notifications ?? [];

  return (
    <BlockStack gap={'600'}>
      <BlockStack gap={'100'}>
        <Text as="p" variant="headingMd" fontWeight="bold">
          Special Order Notifications
        </Text>

        <Text as="p" variant="bodyMd" tone="subdued" truncate>
          Notifications can be sent to customers whenever you create a Special Order, or when special order items arrive
        </Text>
      </BlockStack>

      {notifications.length === 0 && !wipNotification && (
        <BlockStack inlineAlign="center" gap={'400'}>
          <Text as="p" variant="bodyMd" fontWeight="bold">
            No notifications configured
          </Text>
        </BlockStack>
      )}

      {(notifications.length !== 0 || wipNotification) && (
        <BlockStack gap={'200'}>
          {notifications.map((notification, i) => (
            <NotificationSettingsNotificationCard
              subject="special-order"
              settings={settings}
              notification={notification}
              setNotification={newNotification =>
                setSettings({
                  ...settings,
                  specialOrders: {
                    ...settings.specialOrders,
                    notifications: notifications.map(x => (x === notification ? newNotification : x)),
                  },
                })
              }
              onRemove={() =>
                setSettings({
                  ...settings,
                  specialOrders: {
                    ...settings.specialOrders,
                    notifications: notifications.filter(x => x !== notification),
                  },
                })
              }
            />
          ))}

          {wipNotification && (
            <NotificationSettingsNotificationCard
              subject="special-order"
              open
              notification={wipNotification}
              settings={settings}
              setNotification={notification => setWipNotification(notification)}
              onSave={notification => {
                setWipNotification(undefined);
                setSettings({
                  ...settings,
                  specialOrders: {
                    ...settings.specialOrders,
                    notifications: [...notifications, notification],
                  },
                });
              }}
              onRemove={() => setWipNotification(undefined)}
            />
          )}
        </BlockStack>
      )}

      {!wipNotification && (
        <InlineStack align="center">
          <Button
            onClick={() =>
              setWipNotification({
                type: 'on-create',
                sms: { message: '' },
                email: { subject: '', message: '' },
              })
            }
          >
            New Notification
          </Button>
        </InlineStack>
      )}
    </BlockStack>
  );
}
