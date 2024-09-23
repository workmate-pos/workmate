import { useEffect, useState } from 'react';
import { Banner, ScrollView, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useForm } from '@teifi-digital/pos-tools/form';
import { useSendWorkOrderNotificationMutation } from '@work-orders/common/queries/use-send-work-order-notification-mutation.js';
import { useRouter } from '../../routes.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { FormStringField } from '@teifi-digital/pos-tools/form/components/FormStringField.js';
import { FormButton } from '@teifi-digital/pos-tools/form/components/FormButton.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import { useCustomerNotificationPreferenceQuery } from '@work-orders/common/queries/use-customer-notification-preference-query.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { getNotificationType } from '@work-orders/common/notifications/notifications.js';
import { SendNotification } from '@web/schemas/generated/send-notification.js';

type WorkOrderNotification = ShopSettings['workOrder']['notifications'][number];

export function WorkOrderNotificationConfig({
  name,
  notification: notificationTemplate,
}: {
  name: string | null;
  notification: WorkOrderNotification;
}) {
  const fetch = useAuthenticatedFetch();

  const workOrderQuery = useWorkOrderQuery({ fetch, name });
  const workOrder = workOrderQuery.data?.workOrder;

  const customerQuery = useCustomerQuery({ fetch, id: workOrder?.customerId ?? null });
  const customer = customerQuery.data;

  const customerNotificationPreferenceQuery = useCustomerNotificationPreferenceQuery({
    fetch,
    customerId: workOrder?.customerId ?? null,
  });
  const customerNotificationPreference = customerNotificationPreferenceQuery.data;

  const settingsQuery = useSettingsQuery({ fetch });
  const settings = settingsQuery.data?.settings;

  const sendWorkOrderNotificationMutation = useSendWorkOrderNotificationMutation({ fetch });

  const queries = {
    workOrderQuery,
    customerQuery,
    customerNotificationPreferenceQuery,
    settingsQuery,
  };

  const isLoading =
    workOrderQuery.isLoading ||
    customerQuery.isLoading ||
    customerNotificationPreferenceQuery.isLoading ||
    settingsQuery.isLoading;

  const screen = useScreen();
  screen.setIsLoading(isLoading);

  const [notification, setNotification] = useState<EmailNotification | SmsNotification>();

  useEffect(() => {
    if (!!workOrder && !!settings && !!customer && customerNotificationPreference !== undefined) {
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
        toast.show('User cannot receive notifications. Add an email address and/or phone number');
      } else {
        toast.show(`Unsupported notification type '${notificationType}'`);
      }
    }
  }, [notificationTemplate, workOrder, settings, customer, customerNotificationPreference]);

  const router = useRouter();

  // TODO: Make form store the state internally, erroring whenever the state is invalid, allowing mutations. OnSubmit should be provided all the state
  const { Form } = useForm();

  const body = !notification ? null : notification.type === 'sms' ? (
    <SmsForm notification={notification} setNotification={setNotification} />
  ) : notification.type === 'email' ? (
    <EmailForm notification={notification} setNotification={setNotification} />
  ) : (
    (notification satisfies never)
  );

  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  return (
    <ScrollView>
      <Form disabled={sendWorkOrderNotificationMutation.isLoading}>
        <ResponsiveStack direction={'vertical'} spacing={2}>
          {Object.entries(queries)
            .filter(([, query]) => query.isError)
            .map(([key, query]) => (
              <Banner
                key={key}
                title={`Error loading ${titleCase(key).replace(/Query$/, '')}: ${extractErrorMessage(
                  query.error,
                  'unknown error',
                )}`}
                variant={'error'}
                visible
                action={{
                  content: 'Retry',
                  onAction: () => query.refetch(),
                }}
              />
            ))}

          {sendWorkOrderNotificationMutation.isError && (
            <Banner
              visible
              title={`Error sending notification: ${extractErrorMessage(sendWorkOrderNotificationMutation.error, 'unknown error')}`}
              variant={'error'}
            />
          )}

          {body}

          <FormButton
            title={'Send'}
            type={'primary'}
            action={'submit'}
            disabled={!name || !notification}
            loading={sendWorkOrderNotificationMutation.isLoading}
            onPress={() =>
              sendWorkOrderNotificationMutation.mutate(
                { name: name!, body: { notification: notification! } },
                {
                  onSuccess() {
                    toast.show('Notification sent!');
                    router.popCurrent();
                  },
                },
              )
            }
          />
        </ResponsiveStack>
      </Form>
    </ScrollView>
  );
}

type SmsNotification = SendNotification['notification'] & { type: 'sms' };

function SmsForm({
  notification,
  setNotification,
}: {
  notification: SmsNotification;
  setNotification: (notification: SmsNotification) => void;
}) {
  return (
    <ResponsiveStack direction={'vertical'} spacing={2}>
      <FormStringField
        label={'Message'}
        type={'area'}
        value={notification.message}
        onChange={message => setNotification({ ...notification, message })}
        required
      />
      <FormStringField
        label={'Phone Number'}
        value={notification.recipient}
        onChange={recipient => setNotification({ ...notification, recipient })}
        required
      />
    </ResponsiveStack>
  );
}

type EmailNotification = SendNotification['notification'] & { type: 'email' };

function EmailForm({
  notification,
  setNotification,
}: {
  notification: EmailNotification;
  setNotification: (notification: EmailNotification) => void;
}) {
  return (
    <ResponsiveStack direction={'vertical'} spacing={2}>
      <FormStringField
        label={'Subject'}
        value={notification.subject}
        onChange={subject => setNotification({ ...notification, subject })}
        required
      />
      <FormStringField
        label={'Message'}
        type={'area'}
        value={notification.message}
        onChange={message => setNotification({ ...notification, message })}
        required
      />
      <FormStringField
        label={'Email Address'}
        value={notification.recipient}
        onChange={recipient => setNotification({ ...notification, recipient })}
        required
      />

      <FormStringField
        label={'Reply To'}
        value={notification.replyTo}
        onChange={replyTo => setNotification({ ...notification, replyTo })}
      />
      <FormStringField
        label={'From'}
        value={notification.from}
        onChange={from => setNotification({ ...notification, from })}
        required
      />
    </ResponsiveStack>
  );
}
