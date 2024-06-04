import { Decimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import type { ID, DateTime, Int, Money } from '../gql/queries/generated/schema.js';
import { ShopifyOrderType } from '../db/queries/generated/shopify-order.sql.js';

export type WorkOrder = {
  name: string;
  status: string;
  dueDate: DateTime;
  note: string;
  internalNote: string;
  customerId: ID;
  derivedFromOrderId: ID | null;
  items: WorkOrderItem[];
  charges: WorkOrderCharge[];
  orders: WorkOrderOrder[];
  customFields: Record<string, string>;
  discount: WorkOrderDiscount | null;
};

export type WorkOrderDiscount =
  | {
      type: 'FIXED_AMOUNT';
      value: Money;
    }
  | {
      type: 'PERCENTAGE';
      value: Decimal;
    };

export type WorkOrderItem = {
  uuid: string;
  shopifyOrderLineItem: ShopifyOrderLineItem | null;
  productVariantId: ID;
  quantity: Int;
  absorbCharges: boolean;
  purchaseOrders: WorkOrderPurchaseOrder[];
  customFields: Record<string, string>;
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
  amountLocked: boolean;
  removeLocked: boolean;
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
  rateLocked: boolean;
  hoursLocked: boolean;
  removeLocked: boolean;
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

export type WorkOrderInfo = WorkOrder;
