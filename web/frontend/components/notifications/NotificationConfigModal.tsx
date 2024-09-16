import { SendNotification } from '@web/schemas/generated/send-notification.js';
import { Banner, FormLayout, Modal, TextField } from '@shopify/polaris';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import { useEffect, useState } from 'react';
import { getNotificationType } from '@work-orders/common/notifications/notifications.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useCustomerNotificationPreferenceQuery } from '@work-orders/common/queries/use-customer-notification-preference-query.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';

export type EmailNotification = SendNotification['notification'] & { type: 'email' };
export type SmsNotification = SendNotification['notification'] & { type: 'sms' };

type NotificationTemplate = {
  email: {
    subject: string;
    message: string;
  };
  sms: {
    message: string;
  };
};

export function NotificationConfigModal({
  notificationTemplate,
  customerId,
  onClose,
  send,
  loading = false,
  disabled = false,
}: {
  notificationTemplate: NotificationTemplate | null;
  customerId: ID | null;
  onClose: () => void;
  disabled?: boolean;
  loading?: boolean;
  send: {
    send: (notification: EmailNotification | SmsNotification) => void;
    isLoading: boolean;
    isError: boolean;
    error: unknown;
  };
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const customerQuery = useCustomerQuery({ fetch, id: customerId });
  const customer = customerQuery.data;

  const customerNotificationPreferenceQuery = useCustomerNotificationPreferenceQuery({
    fetch,
    customerId,
  });
  const customerNotificationPreference = customerNotificationPreferenceQuery.data;

  const settingsQuery = useSettingsQuery({ fetch });
  const settings = settingsQuery.data?.settings;

  const queries = {
    customerQuery,
    customerNotificationPreferenceQuery,
    settingsQuery,
  };

  const isLoading =
    customerQuery.isLoading || customerNotificationPreferenceQuery.isLoading || settingsQuery.isLoading || loading;

  const [notification, setNotification] = useState<EmailNotification | SmsNotification>();

  useEffect(() => {
    if (!notificationTemplate || !settings || !customer || !customerNotificationPreference === undefined) {
      return;
    }

    const notificationType = getNotificationType(
      customer,
      customerNotificationPreference ?? settings.defaultNotificationPreference,
    );

    if (notificationType === 'sms') {
      setNotification({
        type: 'sms',
        message: notificationTemplate.sms.message,
        recipient: customer.phone!,
      });
    } else if (notificationType === 'email') {
      setNotification({
        type: 'email',
        from: settings.emailFromTitle,
        replyTo: settings.emailReplyTo,
        subject: notificationTemplate.email.subject,
        message: notificationTemplate.email.message,
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
  }, [notificationTemplate, settings, customer, customerNotificationPreference]);

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
        open={!!notificationTemplate}
        title={'Send Notification'}
        onClose={() => {
          setNotification(undefined);
          onClose();
        }}
        loading={isLoading}
        primaryAction={{
          content: 'Send',
          disabled: !notification || disabled,
          loading: send.isLoading,
          onAction: () => send.send(notification!),
        }}
      >
        <Modal.Section>
          {send.isError && (
            <Banner title="Error sending notification" tone="critical">
              {extractErrorMessage(send.error, 'unknown error')}
            </Banner>
          )}

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

          {body}
        </Modal.Section>
      </Modal>

      {toast}
    </>
  );
}

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
