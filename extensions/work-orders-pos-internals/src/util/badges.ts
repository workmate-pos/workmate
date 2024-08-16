import type {
  OrderDisplayFinancialStatus,
  OrderDisplayFulfillmentStatus,
} from '@web/services/gql/queries/generated/schema.js';
import type { BadgeVariant, BadgeStatus } from '@shopify/retail-ui-extensions/src/components/Badge/Badge.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { BadgeProps } from '@shopify/retail-ui-extensions-react';
import { WorkOrderPurchaseOrder, WorkOrderTransferOrder } from '@web/services/work-orders/types.js';
import { sum } from '@teifi-digital/shopify-app-toolbox/array';

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
    text = `${availableQuantity}/${quantity} • ${text}`;
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
    text = `${receivedTransferOrderItemCount}/${transferOrderItemCount} • ${text}`;
  }
  const status = receivedTransferOrderItemCount > 0 ? 'partial' : 'empty';

  return { variant, text, status };
}
