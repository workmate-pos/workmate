import { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import {
  Banner,
  BlockStack,
  Button,
  FormLayout,
  InlineStack,
  Modal,
  ResourceItem,
  ResourceList,
  Text,
  TextField,
} from '@shopify/polaris';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';
import { useCustomerNotificationPreferenceQuery } from '@work-orders/common/queries/use-customer-notification-preference-query.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import {
  getNotificationType,
  OnStatusChangeNotificationVariables,
  replaceNotificationVariables,
} from '@work-orders/common/notifications/on-status-change.js';
import { SendWorkOrderNotification } from '@web/schemas/generated/send-work-order-notification.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useEffect, useState } from 'react';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useSendWorkOrderNotificationMutation } from '@work-orders/common/queries/use-send-work-order-notification-mutation.js';

type WorkOrderNotification = ShopSettings['workOrder']['notifications'][number];

export function WorkOrderNotificationModal({
  name,
  notifications,
  setNotifications,
}: {
  name: string | null;
  notifications: WorkOrderNotification[];
  setNotifications: (notifications: WorkOrderNotification[]) => void;
}) {
  return (
    <>
      <NotificationPickerModal notifications={notifications} setNotifications={setNotifications} />
      <NotificationConfigModal name={name} notifications={notifications} setNotifications={setNotifications} />
    </>
  );
}

function NotificationPickerModal({
  notifications,
  setNotifications,
}: {
  notifications: WorkOrderNotification[];
  setNotifications: (notifications: WorkOrderNotification[]) => void;
}) {
  return (
    <Modal open={notifications.length > 1} title={'Notifications'} onClose={() => setNotifications([])}>
      <ResourceList
        items={notifications}
        resourceName={{ singular: 'notification', plural: 'notifications' }}
        renderItem={(notification, _, idx) => (
          <ResourceItem id={String(idx)} onClick={() => setNotifications([notification])}>
            <BlockStack gap={'050'}>
              <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
                {notification.status}
              </Text>
              <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
                Subject: {notification.email.subject}
              </Text>
              <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
                Email: {notification.email.message}
              </Text>
              <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
                SMS: {notification.sms.message}
              </Text>
            </BlockStack>
          </ResourceItem>
        )}
      />
    </Modal>
  );
}

function NotificationConfigModal({
  name,
  notifications,
  setNotifications,
}: {
  name: string | null;
  notifications: WorkOrderNotification[];
  setNotifications: (notifications: WorkOrderNotification[]) => void;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const workOrderQuery = useWorkOrderQuery({ fetch, name });
  const customerQuery = useCustomerQuery({ fetch, id: workOrderQuery.data?.workOrder?.customerId ?? null });
  const customerNotificationPreferenceQuery = useCustomerNotificationPreferenceQuery({
    fetch,
    customerId: workOrderQuery.data?.workOrder?.customerId ?? null,
  });
  const settingsQuery = useSettingsQuery({ fetch });
  const sendWorkOrderNotificationMutation = useSendWorkOrderNotificationMutation({ fetch });

  const workOrder = workOrderQuery.data?.workOrder;
  const customer = customerQuery.data;
  const customerNotificationPreference = customerNotificationPreferenceQuery.data;
  const settings = settingsQuery.data?.settings;

  const queries = {
    workOrderQuery,
    customerQuery,
    customerNotificationPreferenceQuery,
    settingsQuery,
  };

  const isLoading =
    workOrderQuery.isFetching ||
    customerQuery.isLoading ||
    customerNotificationPreferenceQuery.isLoading ||
    settingsQuery.isLoading;

  const [notification, setNotification] = useState<EmailNotification | SmsNotification>();

  useEffect(() => {
    if (
      notifications.length === 1 &&
      !!workOrder &&
      !!settings &&
      !!customer &&
      customerNotificationPreference !== undefined
    ) {
      const [notification = never()] = notifications;

      const notificationVariables: OnStatusChangeNotificationVariables = {
        name: workOrder.name,
        status: workOrder.status,
        'customer.displayName': customer.displayName,
        'customer.phone': customer.phone,
        'customer.email': customer.email,
      };

      const notificationType = getNotificationType(
        customer,
        customerNotificationPreference ?? settings.defaultNotificationPreference,
      );

      if (notificationType === 'sms') {
        setNotification({
          type: 'sms',
          message: replaceNotificationVariables(notification.sms.message, notificationVariables),
          recipient: customer.phone!,
        });
      } else if (notificationType === 'email') {
        setNotification({
          type: 'email',
          from: settings.emailFromTitle,
          replyTo: settings.emailReplyTo,
          subject: replaceNotificationVariables(notification.email.subject, notificationVariables),
          message: replaceNotificationVariables(notification.email.message, notificationVariables),
          recipient: customer.email!,
        });
      } else if (notificationType === null) {
        setToastAction({
          content: 'User cannot receive notifications. Add an email address and/or phone number',
        });
      } else {
        setToastAction({
          content: `Unsupported notification type '${notificationType}'`,
        });
      }
    }
  }, [notifications]);

  const body = !notification ? null : notification.type === 'sms' ? (
    <SmsForm notification={notification} setNotification={setNotification} />
  ) : notification.type === 'email' ? (
    <EmailForm notification={notification} setNotification={setNotification} />
  ) : (
    (notification satisfies never)
  );

  return (
    <>
      <Modal
        open={notifications.length === 1}
        title={'Send Notification'}
        onClose={() => setNotifications([])}
        loading={isLoading}
      >
        <Modal.Section>
          {Object.entries(queries)
            .filter(([, query]) => query.isError)
            .map(([key, query]) => (
              <Banner
                title={`Error loading ${titleCase(key).replace(/Query$/, '')}`}
                tone="critical"
                action={{
                  content: 'Retry',
                  onAction: () => query.refetch(),
                }}
              >
                {extractErrorMessage(query.error, 'unknown error')}
              </Banner>
            ))}

          <FormLayout>
            {body}

            <InlineStack align="end">
              <Button
                variant="primary"
                loading={sendWorkOrderNotificationMutation.isLoading}
                disabled={!name || !notification}
                onClick={() =>
                  sendWorkOrderNotificationMutation.mutate(
                    { name: name!, body: { notification: notification! } },
                    {
                      onSuccess() {
                        setToastAction({ content: 'Notification sent!' });
                        setNotifications([]);
                      },
                    },
                  )
                }
              >
                Send
              </Button>
            </InlineStack>
          </FormLayout>
        </Modal.Section>
      </Modal>

      {toast}
    </>
  );
}

type EmailNotification = SendWorkOrderNotification['notification'] & { type: 'email' };
type SmsNotification = SendWorkOrderNotification['notification'] & { type: 'sms' };

function EmailForm({
  notification,
  setNotification,
}: {
  notification: EmailNotification;
  setNotification: (notification: EmailNotification) => void;
}) {
  return (
    <FormLayout>
      <TextField
        label={'Subject'}
        autoComplete="off"
        value={notification.subject}
        onChange={subject => setNotification({ ...notification, subject })}
        requiredIndicator
      />

      <TextField
        label={'Message'}
        autoComplete="off"
        multiline
        value={notification.message}
        onChange={message => setNotification({ ...notification, message })}
        requiredIndicator
      />

      <TextField
        label={'Email Address'}
        autoComplete="off"
        value={notification.recipient}
        onChange={recipient => setNotification({ ...notification, recipient })}
        requiredIndicator
      />

      <TextField
        label={'Reply To'}
        autoComplete="off"
        value={notification.replyTo}
        onChange={replyTo => setNotification({ ...notification, replyTo })}
      />

      <TextField
        label={'From'}
        autoComplete="off"
        value={notification.from}
        onChange={from => setNotification({ ...notification, from })}
        requiredIndicator
      />
    </FormLayout>
  );
}

function SmsForm({
  notification,
  setNotification,
}: {
  notification: SmsNotification;
  setNotification: (notification: SmsNotification) => void;
}) {
  return (
    <FormLayout>
      <TextField
        label={'Message'}
        autoComplete="off"
        value={notification.message}
        onChange={message => setNotification({ ...notification, message })}
        requiredIndicator
      />

      <TextField
        label={'Phone Number'}
        autoComplete="off"
        value={notification.recipient}
        onChange={recipient => setNotification({ ...notification, recipient })}
        requiredIndicator
      />
    </FormLayout>
  );
}
