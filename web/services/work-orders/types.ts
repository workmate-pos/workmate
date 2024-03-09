import { Decimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import type { ID, DateTime, Int, Money } from '../gql/queries/generated/schema.js';

export type WorkOrder = {
  name: string;
  status: string;
  dueDate: DateTime;
  note: string;
  customerId: ID;
  derivedFromOrderId: ID | null;
  items: WorkOrderItem[];
  charges: WorkOrderCharge[];
};

export type WorkOrderItem = {
  uuid: string;
  shopifyOrderLineItemId: ID | null;
  productVariantId: ID;
  quantity: Int;
};

export type WorkOrderCharge = FixedPriceLabour | HourlyLabour;

export type FixedPriceLabour = {
  type: 'fixed-price-labour';
  uuid: string;
  workOrderItemUuid: string | null;
  shopifyOrderLineItemId: ID | null;
  employeeId: ID | null;
  name: string;
  amount: Money;
};

export type HourlyLabour = {
  type: 'hourly-labour';
  uuid: string;
  workOrderItemUuid: string | null;
  shopifyOrderLineItemId: ID | null;
  employeeId: ID | null;
  name: string;
  rate: Money;
  hours: Decimal;
};

/**
 * Similar to {@link WorkOrder}, but only shows aggregate information.
 */
export type WorkOrderInfo = {
  name: string;
  status: string;
  dueDate: DateTime;
  customer: {
    id: ID;
    name: string;
  };
  orders: {
    id: ID;
    name: string;
    type: 'DRAFT_ORDER' | 'ORDER';
    total: Money;
    outstanding: Money;
  }[];
};
