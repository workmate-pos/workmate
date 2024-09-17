import { CreateSpecialOrder } from '@web/schemas/generated/create-special-order.js';
import { ShopSettings } from '@web/schemas/generated/shop-settings.js';

type SpecialOrderNotification = NonNullable<ShopSettings['specialOrders']['notifications']>[number];

export function getSpecialOrderMutationNotifications(
  notifications: SpecialOrderNotification[],
  lastSavedSpecialOrder: CreateSpecialOrder | null,
  createSpecialOrder: CreateSpecialOrder,
) {
  return notifications.filter(notification => {
    if (notification.type === 'on-create') {
      return !lastSavedSpecialOrder;
    }

    if (notification.type === 'on-any-item-received' || notification.type === 'on-all-items-received') {
      return false;
    }

    return notification satisfies never;
  });
}
