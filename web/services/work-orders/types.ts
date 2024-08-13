import { Decimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import type { ID, DateTime, Int, Money } from '../gql/queries/generated/schema.js';
import { ShopifyOrderType } from '../db/queries/generated/shopify-order.sql.js';

/**
 * A work order with all available data.
 */
export type DetailedWorkOrder = {
  name: string;
  status: string;
  dueDate: DateTime;
  note: string;
  internalNote: string;
  customerId: ID;
  derivedFromOrderId: ID | null;
  items: DetailedWorkOrderItem[];
  charges: DetailedWorkOrderCharge[];
  orders: WorkOrderOrder[];
  customFields: Record<string, string>;
  discount: WorkOrderDiscount | null;
  companyId: ID | null;
  companyLocationId: ID | null;
  companyContactId: ID | null;
  paymentTerms: WorkOrderPaymentTerms | null;
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

export type WorkOrderPaymentTerms = {
  templateId: ID;
  date: DateTime | null;
};

export type DetailedWorkOrderItem = {
  uuid: string;
  shopifyOrderLineItem: ShopifyOrderLineItem | null;
  quantity: Int;
  absorbCharges: boolean;
  customFields: Record<string, string>;
} & (
  | {
      type: 'product';
      purchaseOrders: WorkOrderPurchaseOrder[];
      transferOrders: WorkOrderTransferOrder[];
      productVariantId: ID;
    }
  | {
      type: 'custom-item';
      name: string;
      unitPrice: Money;
    }
);

export type WorkOrderPurchaseOrder = {
  name: string;
  items: WorkOrderPurchaseOrderItem[];
};

export type WorkOrderPurchaseOrderItem = {
  unitCost: Money;
  quantity: Int;
  availableQuantity: Int;
};

export type WorkOrderTransferOrder = {
  name: string;
  items: WorkOrderTransferOrderItem[];
};

export type WorkOrderTransferOrderItem = {
  status: 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED';
  quantity: Int;
};

export type DetailedWorkOrderCharge = FixedPriceLabour | HourlyLabour;

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

export type WorkOrderInfo = DetailedWorkOrder;
