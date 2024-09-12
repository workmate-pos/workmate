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

          return notification.type satisfies never;
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
          Notifications can be sent to customers whenever you change the status of a Work Order
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
            <WorkOrderNotification
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
            <WorkOrderNotification
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
        <BlockStack gap={'200'}>
          <InlineStack align="center">
            <Button
              disabled={!settings.statuses.length}
              onClick={() =>
                setWipNotification({
                  type: 'on-status-change',
                  status: settings.statuses[0]!,
                  sms: { message: '' },
                  email: { subject: '', message: '' },
                })
              }
            >
              Create Notification
            </Button>
          </InlineStack>
          {settings.statuses.length === 0 && (
            <Text as="p" variant="bodyMd" tone="subdued">
              You must configure statuses before creating notifications
            </Text>
          )}
        </BlockStack>
      )}
    </BlockStack>
  );
}

function WorkOrderNotification({
  settings,
  notification,
  setNotification,
  onSave,
  onRemove,
  open: _open = false,
}: {
  settings: ShopSettings;
  notification: Notification;
  setNotification: (notification: Notification) => void;
  onSave?: (notification: Notification) => void;
  onRemove: () => void;
  open?: boolean;
}) {
  const type = (() => {
    if (notification.type === 'on-status-change') {
      return 'Status Change';
    }

    return notification.type satisfies never;
  })();

  const id = useId();
  const [open, setOpen] = useState(_open);

  useEffect(() => {
    setOpen(_open);
  }, [_open]);

  const isValid =
    settings.statuses.includes(notification.status) &&
    notification.sms.message.trim().length > 0 &&
    notification.email.subject.trim().length > 0 &&
    notification.email.message.trim().length > 0;

  const helpText = (
    <>
      Available variables:{' '}
      <Text as="p" fontWeight="semibold">
        {'{{name}}, {{status}}'}
      </Text>
    </>
  );

  return (
    <Card>
      <BlockStack gap={'400'}>
        <InlineStack align="space-between" gap={'200'}>
          <Text as="p" variant="bodyMd" fontWeight="bold">
            {type} Notification
          </Text>

          <span
            style={{
              transform: open ? 'rotate(180deg)' : undefined,
              transition: 'all 0.2s ease-in-out',
            }}
            onClick={() => setOpen(current => !current)}
          >
            <Icon source={CaretUpMinor} tone={'subdued'} />
          </span>
        </InlineStack>

        <Collapsible id={id} open={open}>
          <FormLayout>
            <Select
              label={'Status'}
              name="status"
              value={notification.status}
              options={settings.statuses.map(status => ({ id: status, label: status, value: status }))}
              onChange={status => setNotification({ ...notification, status })}
              requiredIndicator
            />

            <Divider />

            <Text as="p" variant="bodyMd" fontWeight="bold">
              SMS
            </Text>

            <TextField
              requiredIndicator
              label={'Message'}
              autoComplete="off"
              value={notification.sms.message}
              onChange={message => setNotification({ ...notification, sms: { ...notification.sms, message } })}
              helpText={helpText}
            />

            <Divider />

            <Text as="p" variant="bodyMd" fontWeight="bold">
              Email
            </Text>

            <TextField
              requiredIndicator
              label={'Subject'}
              autoComplete="off"
              value={notification.email.subject}
              onChange={subject => setNotification({ ...notification, email: { ...notification.email, subject } })}
              helpText={helpText}
            />

            <TextField
              requiredIndicator
              label={'Message'}
              autoComplete="off"
              value={notification.email.message}
              onChange={message => setNotification({ ...notification, email: { ...notification.email, message } })}
              helpText={helpText}
            />

            <InlineStack align="end" gap={'200'}>
              <Button variant="primary" tone="critical" onClick={() => onRemove()}>
                Remove
              </Button>
              {!!onSave && (
                <Button variant="primary" onClick={() => onSave(notification)} disabled={!isValid}>
                  Save
                </Button>
              )}
            </InlineStack>
          </FormLayout>
        </Collapsible>
      </BlockStack>
    </Card>
  );
}
