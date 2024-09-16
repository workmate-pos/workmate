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
import { useId, useState } from 'react';
import { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { UnionToIntersection } from '@teifi-digital/shopify-app-toolbox/types';

type WorkOrderNotification = ShopSettings['workOrder']['notifications'][number];
type SpecialOrderNotification = NonNullable<ShopSettings['specialOrders']['notifications']>[number];

type BaseNotificationSettingsCardProps<Notification> = {
  settings: ShopSettings;
  notification: Notification;
  setNotification: (notification: Notification) => void;
  onSave?: (notification: Notification) => void;
  onRemove: () => void;
  open?: boolean;
};

type NoInfer<T> = [T][T extends any ? 0 : never];

export type NotificationSettingsCardProps =
  | ({ subject: 'work-order' } & NoInfer<BaseNotificationSettingsCardProps<WorkOrderNotification>>)
  | ({ subject: 'special-order' } & NoInfer<BaseNotificationSettingsCardProps<SpecialOrderNotification>>);

export function NotificationSettingsNotificationCard({
  settings,
  notification,
  setNotification,
  onSave,
  onRemove,
  open: _open = false,
  subject,
}: NotificationSettingsCardProps) {
  const [toast, setToastAction] = useToast();

  const id = useId();
  const [open, setOpen] = useState(_open);

  let isValid =
    notification.sms.message.trim().length > 0 &&
    notification.email.subject.trim().length > 0 &&
    notification.email.message.trim().length > 0;

  let title = 'Notification';
  let helpText = null;
  let availableVariables: string[] = [];

  if (notification.type === 'on-status-change') {
    isValid ||= settings.statuses.includes(notification.status);
    title = `When the ${titleCase(subject).toLowerCase()} status changes to ${notification.status}`;
  } else if (notification.type === 'on-create') {
    title = `When a ${titleCase(subject).toLowerCase()} is created`;
  } else if (notification.type === 'on-any-item-received') {
    title = `When a ${titleCase(subject).toLowerCase()} item arrives`;
  } else if (notification.type === 'on-all-items-received') {
    title = `When all ${titleCase(subject).toLowerCase()} items have arrived`;
  } else {
    return notification satisfies never;
  }

  if (subject === 'work-order') {
    availableVariables = ['name', 'status', 'customer.displayName', 'customer.phone', 'customer.email'];
  } else if (subject === 'special-order') {
    availableVariables = [
      'name',
      'customer.displayName',
      'customer.phone',
      'customer.email',
      'location.name',
      'note',
      'lineItems[i].quantity',
      'lineItems[i].displayName',
      'lineItems[i].availableQuantity',
    ];
  }

  const notificationTypeOptions = [
    {
      label: 'On create',
      value: 'on-create',
    },
    subject === 'work-order'
      ? {
          label: 'On status change',
          value: 'on-status-change',
          disabled: settings.statuses.length === 0,
        }
      : null,
    subject === 'special-order'
      ? {
          label: 'Whenever an item arrives',
          value: 'on-any-item-received',
        }
      : null,
    subject === 'special-order'
      ? {
          label: 'When all items have arrived',
          value: 'on-all-items-received',
        }
      : null,
  ].filter(isNonNullable);

  return (
    <Card>
      <BlockStack gap={'400'}>
        <InlineStack align="space-between" gap={'200'}>
          <Text as="p" variant="bodyMd" fontWeight="bold">
            {title}
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
            {availableVariables.length > 0 && (
              <BlockStack gap={'100'}>
                <Text as="p" variant="bodySm" tone="subdued">
                  You can use numerous variables related to {titleCase(subject)}
                  to mark up your notifications. The following variables are available:{' '}
                </Text>

                <InlineStack gap={'100'}>
                  {availableVariables.map(variable => (
                    <Text key={variable} as="p" variant="bodySm" fontWeight="semibold" tone="subdued">
                      {`{{${variable}}}`}
                    </Text>
                  ))}
                </InlineStack>
              </BlockStack>
            )}

            {notificationTypeOptions.length > 1 && (
              <Select
                label={'Notification Type'}
                name="notification-type"
                options={notificationTypeOptions}
                requiredIndicator
                value={notification.type}
                onChange={type => {
                  if (type === notification.type) {
                    return;
                  }

                  if (subject === 'work-order' && type === 'on-status-change') {
                    setNotification({
                      type: 'on-status-change',
                      status: settings.statuses[0]!,
                      sms: { message: '' },
                      email: { subject: '', message: '' },
                    });
                  } else if (type === 'on-create') {
                    setNotification({
                      type: 'on-create',
                      sms: { message: '' },
                      email: { subject: '', message: '' },
                    });
                  } else if (subject === 'special-order' && type === 'on-any-item-received') {
                    setNotification({
                      type: 'on-any-item-received',
                      sms: { message: '' },
                      email: { subject: '', message: '' },
                    });
                  } else if (subject === 'special-order' && type === 'on-all-items-received') {
                    setNotification({
                      type: 'on-all-items-received',
                      sms: { message: '' },
                      email: { subject: '', message: '' },
                    });
                  } else {
                    setToastAction({ content: 'Unknown notification type' });
                  }
                }}
              />
            )}

            {subject === 'work-order' && notification.type === 'on-status-change' && (
              <Select
                label={'Status'}
                name="status"
                value={notification.status}
                options={settings.statuses.map(status => ({ id: status, label: status, value: status }))}
                onChange={status => setNotification({ ...notification, status })}
                requiredIndicator
              />
            )}

            <Divider />

            <Text as="p" variant="bodyMd" fontWeight="bold">
              SMS
            </Text>

            <TextField
              requiredIndicator
              label={'Message'}
              autoComplete="off"
              value={notification.sms.message}
              onChange={message =>
                setNotification({
                  ...notification,
                  sms: { ...notification.sms, message },
                } as UnionToIntersection<typeof notification>)
              }
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
              onChange={subject =>
                setNotification({
                  ...notification,
                  email: { ...notification.email, subject },
                } as UnionToIntersection<typeof notification>)
              }
              helpText={helpText}
            />

            <TextField
              requiredIndicator
              label={'Message'}
              autoComplete="off"
              value={notification.email.message}
              onChange={message =>
                setNotification({
                  ...notification,
                  email: { ...notification.email, message },
                } as UnionToIntersection<typeof notification>)
              }
              helpText={helpText}
            />

            <InlineStack align="end" gap={'200'}>
              <Button variant="primary" tone="critical" onClick={() => onRemove()}>
                Remove
              </Button>
              {!!onSave && (
                <Button
                  variant="primary"
                  onClick={() => onSave(notification as UnionToIntersection<typeof notification>)}
                  disabled={!isValid}
                >
                  Save
                </Button>
              )}
            </InlineStack>
          </FormLayout>
        </Collapsible>
      </BlockStack>

      {toast}
    </Card>
  );
}
