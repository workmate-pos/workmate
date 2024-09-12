import { SendWorkOrderNotification } from '@web/schemas/generated/send-work-order-notification.js';
import { useState } from 'react';
import { Banner, ScrollView, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useForm } from '@teifi-digital/pos-tools/form';
import { useSendWorkOrderNotificationMutation } from '@work-orders/common/queries/use-send-work-order-notification-mutation.js';
import { useRouter } from '../../routes.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { FormStringField } from '@teifi-digital/pos-tools/form/components/FormStringField.js';
import { FormButton } from '@teifi-digital/pos-tools/form/components/FormButton.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';

export function SendWorkOrderNotification({
  name,
  notification: initialNotification,
}: {
  name: string;
  notification: SendWorkOrderNotification['notification'];
}) {
  const [notification, setNotification] = useState(initialNotification);

  const fetch = useAuthenticatedFetch();
  const sendWorkOrderNotificationMutation = useSendWorkOrderNotificationMutation({ fetch });

  const router = useRouter();

  // TODO: Make form store the state internally, erroring whenever the state is invalid, allowing mutations. OnSubmit should be provided all the state
  const { Form } = useForm();

  const body =
    notification.type === 'sms' ? (
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
            loading={sendWorkOrderNotificationMutation.isLoading}
            onPress={() =>
              sendWorkOrderNotificationMutation.mutate(
                { name, body: { notification } },
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

type SmsNotification = SendWorkOrderNotification['notification'] & { type: 'sms' };

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

type EmailNotification = SendWorkOrderNotification['notification'] & { type: 'email' };

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
