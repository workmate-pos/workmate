import { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { DetailedSpecialOrder } from '@web/services/special-orders/types.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';

type SpecialOrderNotification = NonNullable<ShopSettings['specialOrders']['notifications']>[number];

/**
 * When purchase orders are saved they may change the status of special orders,
 * so figure out which special orders to send notifications for.
 */
export function getPurchaseOrderMutationNotifications({
  specialOrderNotifications,
  lastSavedCreatePurchaseOrder,
  createPurchaseOrder,
  specialOrders,
}: {
  specialOrderNotifications: SpecialOrderNotification[];
  lastSavedCreatePurchaseOrder: CreatePurchaseOrder | null;
  createPurchaseOrder: CreatePurchaseOrder;
  specialOrders: DetailedSpecialOrder[];
}) {
  const receivedSpecialOrderLineItems = createPurchaseOrder.lineItems.filter(lineItem => {
    if (!lineItem.specialOrderLineItem) {
      return false;
    }

    const lastSavedLineItem = lastSavedCreatePurchaseOrder?.lineItems.find(
      lastSavedLineItem => lastSavedLineItem.uuid === lineItem.uuid,
    );

    if (!lastSavedLineItem) {
      return lineItem.availableQuantity > 0;
    }

    return lineItem.availableQuantity > lastSavedLineItem.availableQuantity;
  });

  const changedSpecialOrderNames = unique(
    receivedSpecialOrderLineItems.map(lineItem => lineItem.specialOrderLineItem?.name).filter(isNonNullable),
  );

  return changedSpecialOrderNames
    .flatMap(specialOrderName => {
      const specialOrder = specialOrders.find(specialOrder => specialOrder.name === specialOrderName);

      if (!specialOrder) {
        return;
      }

      if (specialOrder.purchaseOrderState === 'ALL_RECEIVED') {
        return specialOrderNotifications
          .filter(notification => notification.type === 'on-all-items-received')
          .map(notification => ({
            notification,
            specialOrder,
          }));
      }

      if (specialOrder.purchaseOrderState === 'NOT_ALL_RECEIVED') {
        return specialOrderNotifications
          .filter(notification => notification.type === 'on-any-item-received')
          .map(notification => ({
            notification,
            specialOrder,
          }));
      }

      return [];
    })
    .filter(isNonNullable);
}
