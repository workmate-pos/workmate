import { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { useSpecialOrderQuery } from '@work-orders/common/queries/use-special-order-query.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useSendSpecialOrderNotificationMutation } from '@work-orders/common/queries/use-send-special-order-notification-mutation.js';
import { NotificationPickerModal } from '@web/frontend/components/notifications/NotificationPickerModal.js';
import { NotificationConfigModal } from '@web/frontend/components/notifications/NotificationConfigModal.js';

type SpecialOrderNotification = NonNullable<ShopSettings['specialOrders']['notifications']>[number];

export function SpecialOrderNotificationModal({
  name,
  notifications,
  setNotifications,
}: {
  name: string | null;
  notifications: SpecialOrderNotification[];
  setNotifications: (notifications: SpecialOrderNotification[]) => void;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const notificationTemplate = notifications.length === 1 ? notifications[0]! : null;
  const specialOrderQuery = useSpecialOrderQuery({ fetch, name });
  const specialOrder = specialOrderQuery.data;

  const sendSpecialOrderNotificationMutation = useSendSpecialOrderNotificationMutation({ fetch });

  return (
    <>
      <NotificationPickerModal
        subject="special-order"
        notifications={notifications}
        onSelect={notification => setNotifications([notification])}
        onClose={() => setNotifications([])}
        open={notifications.length > 1}
      />
      <NotificationConfigModal
        onClose={() => setNotifications([])}
        notificationTemplate={notificationTemplate}
        customerId={specialOrder?.customer?.id ?? null}
        loading={specialOrderQuery.isLoading}
        send={{
          send: notification => {
            sendSpecialOrderNotificationMutation.mutate(
              {
                name: name!,
                body: { notification },
              },
              {
                onSuccess() {
                  setToastAction({ content: 'Notification sent!' });
                  setNotifications([]);
                },
              },
            );
          },
          isLoading: sendSpecialOrderNotificationMutation.isLoading,
          isError: sendSpecialOrderNotificationMutation.isError,
          error: sendSpecialOrderNotificationMutation.error,
        }}
      />

      {toast}
    </>
  );
}
