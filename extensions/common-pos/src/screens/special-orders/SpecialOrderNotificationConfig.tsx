import { useEffect, useState } from 'react';
import { Banner, ScrollView, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useForm } from '@teifi-digital/pos-tools/form';
import { useSendSpecialOrderNotificationMutation } from '@work-orders/common/queries/use-send-special-order-notification-mutation.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { FormStringField } from '@teifi-digital/pos-tools/form/components/FormStringField.js';
import { FormButton } from '@teifi-digital/pos-tools/form/components/FormButton.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useSpecialOrderQuery } from '@work-orders/common/queries/use-special-order-query.js';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import { useCustomerNotificationPreferenceQuery } from '@work-orders/common/queries/use-customer-notification-preference-query.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { getNotificationType } from '@work-orders/common/notifications/notifications.js';
import { SendNotification } from '@web/schemas/generated/send-notification.js';
import { UseRouter } from '../router.js';

// TODO: Merge with WorkOrderNotificationConfig

type SpecialOrderNotification = NonNullable<ShopSettings['specialOrders']['notifications']>[number];

export type SpecialOrderNotificationConfigProps = {
  name: string | null;
  notification: SpecialOrderNotification;
  useRouter: UseRouter;
};

export function SpecialOrderNotificationConfig({
  name,
  notification: notificationTemplate,
  useRouter,
}: SpecialOrderNotificationConfigProps) {
  const fetch = useAuthenticatedFetch();

  const specialOrderQuery = useSpecialOrderQuery({ fetch, name });
  const specialOrder = specialOrderQuery.data;

  const customerQuery = useCustomerQuery({ fetch, id: specialOrder?.customer?.id ?? null });
  const customer = customerQuery.data;

  const customerNotificationPreferenceQuery = useCustomerNotificationPreferenceQuery({
    fetch,
    customerId: specialOrder?.customer?.id ?? null,
  });
  const customerNotificationPreference = customerNotificationPreferenceQuery.data;

  const settingsQuery = useSettingsQuery({ fetch });
  const settings = settingsQuery.data?.settings;

  const sendSpecialOrderNotificationMutation = useSendSpecialOrderNotificationMutation({ fetch });

  const queries = {
    specialOrderQuery,
    customerQuery,
    customerNotificationPreferenceQuery,
    settingsQuery,
  };

  const isLoading =
    specialOrderQuery.isLoading ||
    customerQuery.isLoading ||
    customerNotificationPreferenceQuery.isLoading ||
    settingsQuery.isLoading;

  const screen = useScreen();
  screen.setTitle(`Special Order ${name} Notification`);
  screen.setIsLoading(isLoading);

  const [notification, setNotification] = useState<EmailNotification | SmsNotification>();

  useEffect(() => {
    if (!!specialOrder && !!settings && !!customer && customerNotificationPreference !== undefined) {
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
  }, [notificationTemplate, specialOrder, settings, customer, customerNotificationPreference]);

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
      <Form disabled={sendSpecialOrderNotificationMutation.isLoading}>
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

          {sendSpecialOrderNotificationMutation.isError && (
            <Banner
              visible
              title={`Error sending notification: ${extractErrorMessage(sendSpecialOrderNotificationMutation.error, 'unknown error')}`}
              variant={'error'}
            />
          )}

          {body}

          <FormButton
            title={'Send'}
            type={'primary'}
            action={'submit'}
            disabled={!name || !notification}
            loading={sendSpecialOrderNotificationMutation.isLoading}
            onPress={() =>
              sendSpecialOrderNotificationMutation.mutate(
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
