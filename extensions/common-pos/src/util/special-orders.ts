import { DetailedSpecialOrder } from '@web/services/special-orders/types.js';
import { BadgeProps } from '@shopify/retail-ui-extensions-react';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';

export function getDetailedSpecialOrderSubtitle(specialOrder: DetailedSpecialOrder) {
  return undefined;
}

export function getDetailedSpecialOrderBadges(specialOrder: DetailedSpecialOrder): BadgeProps[] {
  const workOrderOrderIds = new Set(...specialOrder.workOrders.flatMap(wo => wo.orderIds));

  return [
    { text: specialOrder.customer.displayName, variant: 'neutral' } as const,
    { text: specialOrder.location.name, variant: 'neutral' } as const,
    getSpecialOrderOrderStateBadge(specialOrder),
    specialOrder.purchaseOrders.length > 0 ? getSpecialOrderPurchaseOrderStateBadge(specialOrder) : null,
    ...specialOrder.workOrders.map<BadgeProps>(workOrder => ({
      text: workOrder.name,
      variant: 'highlight',
    })),
    ...specialOrder.orders
      .filter(hasPropertyValue('type', 'ORDER'))
      .filter(order => !workOrderOrderIds.has(order.id))
      .map<BadgeProps>(order => ({
        text: order.name,
        variant: 'highlight',
      })),
    ...specialOrder.purchaseOrders.map<BadgeProps>(po => ({
      text: `${po.name} (${po.vendorName})`,
      variant: po.availableQuantity >= po.quantity ? 'success' : 'warning',
      status: po.availableQuantity >= po.quantity ? 'complete' : po.availableQuantity > 0 ? 'partial' : 'empty',
    })),
  ].filter(isNonNullable);
}

export function getSpecialOrderOrderStateBadge({ orderState, purchaseOrders }: DetailedSpecialOrder): BadgeProps {
  return {
    text: titleCase(orderState),
    variant: orderState === 'FULLY_ORDERED' ? 'success' : 'warning',
    status: orderState === 'FULLY_ORDERED' ? 'complete' : purchaseOrders.length > 0 ? 'partial' : 'empty',
  };
}

export function getSpecialOrderPurchaseOrderStateBadge({
  purchaseOrderState,
  purchaseOrders,
}: DetailedSpecialOrder): BadgeProps {
  return {
    text: titleCase(purchaseOrderState),
    variant: purchaseOrderState === 'ALL_RECEIVED' ? 'success' : 'warning',
    status:
      purchaseOrderState === 'ALL_RECEIVED'
        ? 'complete'
        : purchaseOrders.some(po => po.availableQuantity > 0)
          ? 'partial'
          : 'empty',
  };
}
