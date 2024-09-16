import { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';

type WorkOrderNotification = ShopSettings['workOrder']['notifications'][number];

export function getWorkOrderMutationNotifications(
  notifications: WorkOrderNotification[],
  lastSavedWorkOrder: CreateWorkOrder | null,
  createWorkOrder: CreateWorkOrder,
) {
  return notifications.filter(notification => {
    if (notification.type === 'on-status-change') {
      return notification.status === lastSavedWorkOrder?.status;
    }

    if (notification.type === 'on-create') {
      return !lastSavedWorkOrder;
    }

    return notification satisfies never;
  });
}
