import { DetailedSpecialOrder } from '@web/services/special-orders/types.js';
import { BadgeProps } from '@shopify/ui-extensions-react/point-of-sale';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { sum } from '@teifi-digital/shopify-app-toolbox/array';
import { getSubtitle } from './subtitle.js';

export function getDetailedSpecialOrderSubtitle(specialOrder: DetailedSpecialOrder) {
  return getSubtitle([specialOrder.requiredBy ? new Date(specialOrder.requiredBy).toLocaleDateString() : undefined]);
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
      variant: po.availableQuantity >= po.orderedQuantity ? 'success' : 'warning',
      status: po.availableQuantity >= po.orderedQuantity ? 'complete' : po.availableQuantity > 0 ? 'partial' : 'empty',
    })),
  ].filter(isNonNullable);
}

export function getSpecialOrderOrderStateBadge({ orderState, purchaseOrders }: DetailedSpecialOrder): BadgeProps {
  return {
    text: titleCase(orderState),
    variant: orderState === 'fully-ordered' ? 'success' : 'warning',
    status: orderState === 'fully-ordered' ? 'complete' : purchaseOrders.length > 0 ? 'partial' : 'empty',
  };
}

export function getSpecialOrderPurchaseOrderStateBadge({
  purchaseOrderState,
  purchaseOrders,
}: DetailedSpecialOrder): BadgeProps {
  return {
    text: titleCase(purchaseOrderState),
    variant: purchaseOrderState === 'all-received' ? 'success' : 'warning',
    status:
      purchaseOrderState === 'all-received'
        ? 'complete'
        : purchaseOrders.some(po => po.availableQuantity > 0)
          ? 'partial'
          : 'empty',
  };
}

// TODO: Also support CreateSpecialOrder line items instead only detailed
export function getSpecialOrderLineItemBadges(
  detailedSpecialOrder: DetailedSpecialOrder,
  lineItem: DetailedSpecialOrder['lineItems'][number],
): BadgeProps[] {
  const orderId = lineItem.shopifyOrderLineItem?.orderId;
  const workOrders = orderId
    ? detailedSpecialOrder.workOrders.filter(workOrder => workOrder.orderIds.includes(orderId))
    : [];

  const orders = orderId ? detailedSpecialOrder.orders.filter(order => order.id === orderId) : [];
  const purchaseOrders = detailedSpecialOrder.purchaseOrders.filter(po =>
    lineItem.purchaseOrderLineItems.map(lineItem => lineItem.purchaseOrderName).includes(po.name),
  );

  const workOrderOrderIds = new Set(...workOrders.flatMap(wo => wo.orderIds));

  return [
    ...workOrders.map<BadgeProps>(workOrder => ({
      text: workOrder.name,
      variant: 'highlight',
    })),
    ...orders
      .filter(order => !workOrderOrderIds.has(order.id))
      .map<BadgeProps>(order => ({
        text: order.name,
        variant: 'highlight',
      })),
    ...purchaseOrders.map<BadgeProps>(po => {
      const lineItemAvailableQuantity = sum(
        lineItem.purchaseOrderLineItems
          .filter(hasPropertyValue('purchaseOrderName', po.name))
          .map(lineItem => lineItem.availableQuantity),
      );

      const lineItemQuantity = sum(
        lineItem.purchaseOrderLineItems
          .filter(hasPropertyValue('purchaseOrderName', po.name))
          .map(lineItem => lineItem.quantity),
      );

      return {
        text: [po.name, `${lineItemAvailableQuantity} / ${lineItemQuantity}`].join(' • '),
        variant: lineItemAvailableQuantity >= po.orderedQuantity ? 'success' : 'warning',
        status:
          lineItemAvailableQuantity >= po.orderedQuantity
            ? 'complete'
            : lineItemAvailableQuantity > 0
              ? 'partial'
              : 'empty',
      };
    }),
  ];
}
