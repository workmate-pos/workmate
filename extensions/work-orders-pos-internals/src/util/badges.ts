import type {
  OrderDisplayFinancialStatus,
  OrderDisplayFulfillmentStatus,
} from '@web/services/gql/queries/generated/schema.js';
import type { BadgeVariant, BadgeStatus } from '@shopify/retail-ui-extensions/src/components/Badge/Badge.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { BadgeProps } from '@shopify/retail-ui-extensions-react';
import {
  DetailedWorkOrder,
  DetailedWorkOrderItem,
  LineItemReservation,
  WorkOrderPurchaseOrder,
  WorkOrderSpecialOrder,
  WorkOrderTransferOrder,
} from '@web/services/work-orders/types.js';
import { sum } from '@teifi-digital/shopify-app-toolbox/array';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';

export function getStatusText(status: OrderDisplayFinancialStatus | OrderDisplayFulfillmentStatus): string {
  return titleCase(status.replace(/_/g, ' '));
}

export function getFinancialStatusBadgeVariant(status: OrderDisplayFinancialStatus): BadgeVariant {
  return (
    {
      PENDING: 'neutral',
      AUTHORIZED: 'neutral',
      EXPIRED: 'neutral',
      PAID: 'neutral',
      PARTIALLY_PAID: 'warning',
      PARTIALLY_REFUNDED: 'neutral',
      REFUNDED: 'neutral',
      VOIDED: 'neutral',
    } as const
  )[status];
}

export function getFinancialStatusBadgeStatus(status: OrderDisplayFinancialStatus): BadgeStatus {
  return (
    {
      PENDING: 'empty',
      AUTHORIZED: 'empty',
      EXPIRED: 'empty',
      PAID: 'complete',
      PARTIALLY_PAID: 'partial',
      PARTIALLY_REFUNDED: 'complete',
      REFUNDED: 'complete',
      VOIDED: 'complete',
    } as const
  )[status];
}

export function getFulfillmentStatusBadgeVariant(status: OrderDisplayFulfillmentStatus): BadgeVariant {
  return (
    {
      UNFULFILLED: 'neutral',
      PARTIALLY_FULFILLED: 'neutral',
      FULFILLED: 'neutral',
      RESTOCKED: 'neutral',
      PENDING_FULFILLMENT: 'neutral',
      OPEN: 'neutral',
      IN_PROGRESS: 'neutral',
      ON_HOLD: 'neutral',
      SCHEDULED: 'neutral',
    } as const
  )[status];
}

export function getFulfillmentStatusBadgeStatus(status: OrderDisplayFulfillmentStatus): BadgeStatus {
  return (
    {
      UNFULFILLED: 'empty',
      PARTIALLY_FULFILLED: 'partial',
      FULFILLED: 'complete',
      RESTOCKED: 'empty',
      PENDING_FULFILLMENT: 'empty',
      OPEN: 'empty',
      IN_PROGRESS: 'empty',
      ON_HOLD: 'empty',
      SCHEDULED: 'empty',
    } as const
  )[status];
}

export function getPurchaseOrderBadge(purchaseOrder: WorkOrderPurchaseOrder, includeQuantity: boolean): BadgeProps {
  const availableQuantity = sum(purchaseOrder.items.map(item => item.availableQuantity));
  const quantity = sum(purchaseOrder.items.map(item => item.quantity));
  const status = availableQuantity === quantity ? 'complete' : availableQuantity === 0 ? 'empty' : 'partial';
  const variant = availableQuantity === quantity ? 'success' : 'warning';

  let text = purchaseOrder.name;

  if (includeQuantity) {
    text = `${text} • ${availableQuantity}/${quantity}`;
  }

  return { text, variant, status } as const;
}

export function getPurchaseOrderBadges(
  purchaseOrders: WorkOrderPurchaseOrder[],
  includeQuantity: boolean,
): BadgeProps[] {
  const purchaseOrderByName: Record<string, WorkOrderPurchaseOrder> = {};

  for (const { name, items } of purchaseOrders) {
    const purchaseOrder = (purchaseOrderByName[name] ??= { name, items: [] });
    purchaseOrder.items.push(...items);
  }

  return Object.values(purchaseOrderByName).map(purchaseOrder => getPurchaseOrderBadge(purchaseOrder, includeQuantity));
}

export function getSpecialOrderBadge(specialOrder: WorkOrderSpecialOrder, includeQuantity: boolean): BadgeProps {
  const { name, items } = specialOrder;

  if (!includeQuantity) {
    return { text: name, variant: 'highlight' };
  }

  let variant: BadgeVariant = 'success';

  if (items.some(item => item.quantity > item.orderedQuantity)) {
    variant = 'warning';
  }

  let text = name;

  const totalQuantity = sum(items.map(item => item.quantity));
  const totalOrderedQuantity = sum(items.map(item => item.orderedQuantity));

  if (includeQuantity) {
    text = `${text} • ${totalOrderedQuantity}/${totalQuantity}`;
  }

  return {
    text,
    variant,
    status: totalQuantity === totalOrderedQuantity ? 'complete' : totalOrderedQuantity > 0 ? 'partial' : 'empty',
  } as const;
}

export function getSpecialOrderBadges(specialOrders: WorkOrderSpecialOrder[], includeQuantity: boolean) {
  const specialOrderByName: Record<string, WorkOrderSpecialOrder> = {};

  for (const { name, items } of specialOrders) {
    const specialOrder = (specialOrderByName[name] ??= { name, items: [] });
    specialOrder.items.push(...items);
  }

  return Object.values(specialOrderByName).map(specialOrder => getSpecialOrderBadge(specialOrder, includeQuantity));
}

export function getTransferOrderBadge(transferOrder: WorkOrderTransferOrder, includeQuantity: boolean): BadgeProps {
  const { name, items } = transferOrder;

  let variant: BadgeVariant = 'success';

  if (items.some(item => item.status === 'PENDING')) {
    variant = 'warning';
  }

  if (items.some(item => item.status === 'IN_TRANSIT')) {
    variant = 'highlight';
  }

  let text = name;

  const receivedTransferOrderItemCount = sum(
    transferOrder.items
      .filter(item => item.status === 'RECEIVED' || item.status === 'REJECTED')
      .map(item => item.quantity),
  );
  const transferOrderItemCount = sum(transferOrder.items.map(item => item.quantity));

  if (includeQuantity) {
    text = `${text} • ${receivedTransferOrderItemCount}/${transferOrderItemCount}`;
  }
  const status = receivedTransferOrderItemCount > 0 ? 'partial' : 'empty';

  return { variant, text, status };
}

export function getTransferOrderBadges(transferOrders: WorkOrderTransferOrder[], includeQuantity: boolean) {
  const transferOrderByName: Record<string, WorkOrderTransferOrder> = {};

  for (const { name, items } of transferOrders) {
    const transferOrder = (transferOrderByName[name] ??= { name, items: [] });
    transferOrder.items.push(...items);
  }

  return Object.values(transferOrderByName).map(transferOrder => getTransferOrderBadge(transferOrder, includeQuantity));
}

export function getReservationBadge(
  reservation: Pick<LineItemReservation, 'quantity'>,
  includeQuantity: boolean,
): BadgeProps {
  const { quantity } = reservation;

  let text = 'Layaway';

  if (includeQuantity) {
    text = `${text} • ${quantity}`;
  }

  return {
    text,
    variant: 'success',
  } as const;
}

export function getReservationBadges(reservations: LineItemReservation[], includeQuantity: boolean) {
  if (reservations.length === 0) {
    return [];
  }

  let quantity = sum(reservations.map(reservation => reservation.quantity));

  return [getReservationBadge({ quantity }, includeQuantity)];
}

export function getWorkOrderItemSourcingBadges(
  workOrder: DetailedWorkOrder,
  item: DetailedWorkOrderItem,
  options?: {
    includeOrderBadge?: boolean;
    includeStatusBadge?: boolean;
  },
): BadgeProps[] {
  const totalSourced = getWorkOrderItemSourcedCount(item);

  const sourcedAllItemsBadge: BadgeProps | undefined =
    options?.includeStatusBadge && totalSourced >= item.quantity
      ? { text: 'Sourced all items', status: 'complete', variant: 'success' }
      : undefined;
  const requiresSourcingBadge: BadgeProps | undefined =
    options?.includeStatusBadge && totalSourced < item.quantity && !isOrderId(item.shopifyOrderLineItem?.orderId)
      ? { text: 'Requires sourcing', status: totalSourced > 0 ? 'partial' : 'empty', variant: 'critical' }
      : undefined;

  const orderBadge: BadgeProps | undefined =
    options?.includeOrderBadge && isOrderId(item.shopifyOrderLineItem?.orderId)
      ? {
          text:
            workOrder.orders.find(hasPropertyValue('id', item.shopifyOrderLineItem.orderId))?.name ?? 'Unknown order',
          status: 'complete',
          variant: 'success',
        }
      : undefined;

  const layawayBadges = item.reservations.map<BadgeProps>(reservation => getReservationBadge(reservation, true));
  const transferOrderBadges = item.transferOrders.map<BadgeProps>(to => getTransferOrderBadge(to, true));
  const specialOrderBadges = item.specialOrders.map<BadgeProps>(so => getSpecialOrderBadge(so, true));
  const purchaseOrderBadges = item.purchaseOrders.map<BadgeProps>(po => getPurchaseOrderBadge(po, true));

  return [
    orderBadge,
    sourcedAllItemsBadge,
    requiresSourcingBadge,
    ...layawayBadges,
    ...transferOrderBadges,
    ...specialOrderBadges,
    ...purchaseOrderBadges,
  ].filter(isNonNullable);
}

export function getWorkOrderItemSourcedCount(
  item: Pick<DetailedWorkOrderItem, 'specialOrders' | 'transferOrders' | 'reservations'>,
) {
  return sum([
    ...item.specialOrders.flatMap(po => po.items).map(item => item.quantity),
    ...item.transferOrders.flatMap(to => to.items).map(item => item.quantity),
    ...item.reservations.map(reservation => reservation.quantity),
  ]);
}

export function isOrderId(id: string | null | undefined): id is ID {
  return !!id && parseGid(id).objectName === 'Order';
}
