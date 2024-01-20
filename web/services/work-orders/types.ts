import type { ID, DateTime, Int, Money, OrderDisplayFinancialStatus } from '../gql/queries/generated/schema.js';
import type { OrderInfo } from '../orders/types.js';
import type { PlaceholderLineItemAttribute } from '@work-orders/common/custom-attributes/attributes/PlaceholderLineItemAttribute.js';
import type { Cents } from '@work-orders/common/util/money.js';
import { UuidAttribute } from '@work-orders/common/custom-attributes/attributes/UuidAttribute.js';
import { SkuAttribute } from '@work-orders/common/custom-attributes/attributes/SkuAttribute.js';
import { CustomAttributeValue } from '@work-orders/common/custom-attributes/CustomAttribute.js';
import { LabourLineItemUuidAttribute } from '@work-orders/common/custom-attributes/attributes/LabourLineItemUuidAttribute.js';

export type WorkOrder = {
  name: string;
  status: string;
  description: string;
  dueDate: DateTime;
  customerId: ID;
  derivedFromOrder: OrderInfo | null;
  /**
   * The order or draft order linked to this work order.
   */
  order: {
    type: 'draft-order' | 'order';
    id: ID;
    name: string;
    outstanding: Money;
    received: Money;
    total: Money;
    discount: {
      valueType: 'FIXED_AMOUNT' | 'PERCENTAGE';
      value: number;
    } | null;
    lineItems: LineItem[];
  };
  employeeAssignments: EmployeeAssignment[];
};

export type EmployeeAssignment = {
  employeeId: ID;
  rate: Cents;
  hours: Int;
  /**
   * A uuid that associates this employee assignment with a line item.
   * Used to differentiate between assignments to different instances of the same productVariantId
   */
  lineItemUuid: string | null;
  productVariantId: ID | null;
};

export type LineItem = {
  id: ID;
  title: string;
  taxable: boolean;
  variant: {
    id: ID;
    image: {
      url: string;
    } | null;
    title: string;
    product: {
      id: ID;
      title: string;
    };
  } | null;
  quantity: Int;
  unitPrice: Money;
  sku: string | null;
  attributes: {
    placeholderLineItem: CustomAttributeValue<typeof PlaceholderLineItemAttribute> | null;
    labourLineItemUuid: CustomAttributeValue<typeof LabourLineItemUuidAttribute> | null;
    uuid: CustomAttributeValue<typeof UuidAttribute> | null;
    sku: CustomAttributeValue<typeof SkuAttribute> | null;
  };
};

/**
 * Similar to {@link WorkOrder}, but without details.
 * This is used to display a list of work orders.
 */
export type WorkOrderInfo = {
  name: string;
  status: string;
  dueDate: DateTime;
  customerId: ID;
  order: {
    name: string;
    total: Money;
    outstanding: Money;
    financialStatus: OrderDisplayFinancialStatus | null;
  };
};
