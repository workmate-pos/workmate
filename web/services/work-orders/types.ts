import { Decimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import type { ID, DateTime, Int, Money } from '../gql/queries/generated/schema.js';
import { ShopifyOrderType } from '../db/queries/generated/shopify-order.sql.js';

export type WorkOrder = {
  name: string;
  status: string;
  dueDate: DateTime;
  note: string;
  customerId: ID;
  derivedFromOrderId: ID | null;
  items: WorkOrderItem[];
  charges: WorkOrderCharge[];
  orders: WorkOrderOrder[];
  customFields: Record<string, string>;
};

export type WorkOrderItem = {
  uuid: string;
  shopifyOrderLineItem: ShopifyOrderLineItem | null;
  productVariantId: ID;
  quantity: Int;
  absorbCharges: boolean;
  purchaseOrders: WorkOrderPurchaseOrder[];
};

export type WorkOrderPurchaseOrder = {
  name: string;
  items: WorkOrderPurchaseOrderItem[];
};

export type WorkOrderPurchaseOrderItem = {
  unitCost: Money;
  quantity: Int;
  availableQuantity: Int;
};

export type WorkOrderCharge = FixedPriceLabour | HourlyLabour;

export type FixedPriceLabour = {
  type: 'fixed-price-labour';
  uuid: string;
  workOrderItemUuid: string | null;
  shopifyOrderLineItem: ShopifyOrderLineItem | null;
  employeeId: ID | null;
  name: string;
  amount: Money;
};

export type HourlyLabour = {
  type: 'hourly-labour';
  uuid: string;
  workOrderItemUuid: string | null;
  shopifyOrderLineItem: ShopifyOrderLineItem | null;
  employeeId: ID | null;
  name: string;
  rate: Money;
  hours: Decimal;
};

export type ShopifyOrderLineItem = {
  id: ID;
  orderId: ID;
  quantity: Int;
  /**
   * Includes any discounts
   */
  discountedUnitPrice: Money;
};

export type WorkOrderOrder = {
  id: ID;
  name: string;
  type: ShopifyOrderType;
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
