import type {
  OrderDisplayFinancialStatus,
  OrderDisplayFulfillmentStatus,
} from '@web/services/gql/queries/generated/schema.js';
import type { BadgeVariant, BadgeStatus } from '@shopify/retail-ui-extensions/src/components/Badge/Badge.js';
import { titleCase } from '@work-orders/common/util/casing.js';

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
