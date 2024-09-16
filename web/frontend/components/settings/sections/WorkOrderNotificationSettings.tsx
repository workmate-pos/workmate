import { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { useEffect, useId, useState } from 'react';
import {
  BlockStack,
  Button,
  Card,
  Collapsible,
  Divider,
  FormLayout,
  Icon,
  InlineStack,
  Select,
  Text,
  TextField,
} from '@shopify/polaris';
import { CaretUpMinor } from '@shopify/polaris-icons';
import { useToast } from '@teifi-digital/shopify-app-react';
import { NotificationSettingsNotificationCard } from '@web/frontend/components/notifications/NotificationSettingsNotificationCard.js';

type Notification = ShopSettings['workOrder']['notifications'][number];

export function WorkOrderNotificationSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: (settings: ShopSettings) => void;
}) {
  // remove invalid notifications
  useEffect(() => {
    const newSettings = {
      ...settings,
      workOrder: {
        ...settings.workOrder,
        notifications: settings.workOrder.notifications.filter(notification => {
          if (notification.type === 'on-status-change') {
            const statusExists = settings.statuses.includes(notification.status);
            return statusExists;
          }

          if (notification.type === 'on-create') {
            return true;
          }

          return notification satisfies never;
        }),
      },
    };

    if (newSettings.workOrder.notifications.length !== settings.workOrder.notifications.length) {
      setSettings(newSettings);
    }
  }, [settings]);

  const [wipNotification, setWipNotification] = useState<Notification>();

  return (
    <BlockStack gap="600">
      <BlockStack gap={'100'}>
        <Text as="p" variant="headingMd" fontWeight="bold">
          Work Order Notifications
        </Text>

        <Text as="p" variant="bodyMd" tone="subdued" truncate>
          Notifications can be sent to customers whenever you create or change the status of a Work Order
        </Text>
      </BlockStack>

      {settings.workOrder.notifications.length === 0 && !wipNotification && (
        <BlockStack inlineAlign="center" gap={'400'}>
          <Text as="p" variant="bodyMd" fontWeight="bold">
            No notifications configured
          </Text>
        </BlockStack>
      )}

      {(settings.workOrder.notifications.length !== 0 || wipNotification) && (
        <BlockStack gap={'200'}>
          {settings.workOrder.notifications.map((notification, i) => (
            <NotificationSettingsNotificationCard
              subject="work-order"
              key={i}
              notification={notification}
              settings={settings}
              setNotification={newNotification =>
                setSettings({
                  ...settings,
                  workOrder: {
                    ...settings.workOrder,
                    notifications: settings.workOrder.notifications.map(x =>
                      x === notification ? newNotification : x,
                    ),
                  },
                })
              }
              onRemove={() =>
                setSettings({
                  ...settings,
                  workOrder: {
                    ...settings.workOrder,
                    notifications: settings.workOrder.notifications.filter(x => x !== notification),
                  },
                })
              }
            />
          ))}

          {wipNotification && (
            <NotificationSettingsNotificationCard
              subject="work-order"
              open
              notification={wipNotification}
              settings={settings}
              setNotification={notification => setWipNotification(notification)}
              onSave={notification => {
                setWipNotification(undefined);
                setSettings({
                  ...settings,
                  workOrder: {
                    ...settings.workOrder,
                    notifications: [...settings.workOrder.notifications, notification],
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
