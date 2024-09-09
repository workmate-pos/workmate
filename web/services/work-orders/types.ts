import { Decimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import type { ID, DateTime, Int, Money } from '../gql/queries/generated/schema.js';
import { ShopifyOrderType } from '../db/queries/generated/shopify-order.sql.js';
import { UUID } from '../../util/types.js';

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
  serial: WorkOrderSerial | null;
};

export type WorkOrderSerial = {
  productVariantId: ID;
  serial: string;
  locationId: ID | null;
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
  uuid: UUID;
  shopifyOrderLineItem: ShopifyOrderLineItem | null;
  quantity: Int;
  absorbCharges: boolean;
  customFields: Record<string, string>;
  purchaseOrders: WorkOrderPurchaseOrder[];
  transferOrders: WorkOrderTransferOrder[];
  reservations: LineItemReservation[];
  specialOrders: WorkOrderSpecialOrder[];
} & (
  | {
      type: 'product';
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

export type WorkOrderSpecialOrder = {
  name: string;
  items: WorkOrderSpecialOrderItem[];
};

export type WorkOrderSpecialOrderItem = {
  quantity: Int;
  orderedQuantity: Int;
};

export type WorkOrderTransferOrder = {
  name: string;
  items: WorkOrderTransferOrderItem[];
};

export type LineItemReservation = {
  locationId: ID;
  quantity: Int;
};

export type WorkOrderTransferOrderItem = {
  status: 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED';
  quantity: Int;
};

export type DetailedWorkOrderCharge = FixedPriceLabour | HourlyLabour;

export type FixedPriceLabour = {
  type: 'fixed-price-labour';
  uuid: UUID;
  workOrderItemUuid: UUID | null;
  shopifyOrderLineItem: ShopifyOrderLineItem | null;
  employeeId: ID | null;
  name: string;
  amount: Money;
  amountLocked: boolean;
  removeLocked: boolean;
};

export type HourlyLabour = {
  type: 'hourly-labour';
  uuid: UUID;
  workOrderItemUuid: UUID | null;
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
