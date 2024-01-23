import { Decimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import type { ID, DateTime, Int, Money, OrderDisplayFinancialStatus } from '../gql/queries/generated/schema.js';
import type { OrderInfo } from '../orders/types.js';

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
    discount: { valueType: 'PERCENTAGE'; value: Decimal } | { valueType: 'FIXED_AMOUNT'; value: Money } | null;
    lineItems: LineItem[];
  };
  labour: (FixedPriceLabour | HourlyLabour)[];
};

export type BaseLabour = {
  name: string;
  employeeId: ID | null;
  /**
   * A uuid that associates this employee assignment with a line item.
   * Used to differentiate between assignments to different instances of the same productVariantId
   */
  lineItemUuid: string | null;
  productVariantId: ID | null;
};

export type FixedPriceLabour = BaseLabour & {
  type: 'fixed-price-labour';
  amount: Money;
};

export type HourlyLabour = BaseLabour & {
  type: 'hourly-labour';
  rate: Money;
  hours: Decimal;
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
      isMutableServiceItem: boolean;
      isFixedServiceItem: boolean;
    };
  } | null;
  quantity: Int;
  unitPrice: Money;
  sku: string | null;
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
