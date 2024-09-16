import { SpecialOrderNotificationModal } from '@web/frontend/components/special-orders/modals/SpecialOrderNotificationModal.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useState } from 'react';
import { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useSpecialOrderQuery } from '@work-orders/common/queries/use-special-order-query.js';
import { NotificationHistoryModal } from '@web/frontend/components/notifications/NotificationHistoryModal.js';

type SpecialOrderNotification = NonNullable<ShopSettings['specialOrders']['notifications']>[number];

export function SpecialOrderNotificationHistoryModal({
  name,
  disabled,
  open,
  onClose,
}: {
  name: string | null;
  disabled: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const specialOrderQuery = useSpecialOrderQuery({ fetch, name });
  const specialOrder = specialOrderQuery.data;

  const settingsQuery = useSettingsQuery({ fetch });
  const settings = settingsQuery.data?.settings;

  const allNotifications = settings?.specialOrders.notifications ?? [];
  // notifications available for sending
  const [availableNotifications, setAvailableNotifications] = useState<SpecialOrderNotification[]>([]);

  return (
    <>
      <NotificationHistoryModal
        subject="special-order"
        disabled={disabled}
        open={open && availableNotifications.length === 0}
        onClose={() => {
          setAvailableNotifications([]);
          onClose();
        }}
        notifications={specialOrder?.notifications ?? []}
        onSendNotification={() => setAvailableNotifications(allNotifications)}
      />

      <SpecialOrderNotificationModal
        name={name}
        notifications={availableNotifications}
        setNotifications={setAvailableNotifications}
      />

      {toast}
    </>
  );
}
