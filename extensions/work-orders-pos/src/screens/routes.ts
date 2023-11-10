import type { WorkOrderCustomer, WorkOrderEmployee, WorkOrderItem, WorkOrderStatus } from './WorkOrder';
import type { WorkOrderSelectorParams } from './popups/WorkOrderSelector';

/**
 * Screen input/output types.
 * Used by useScreen to make navigation type-safe.
 */
export type ScreenInputOutput = {
  Entry: [{ forceReload?: boolean } | undefined, undefined];
  WorkOrder: [{ type: 'load-work-order'; name: string } | { type: 'new-work-order' }, undefined];
  WorkOrderSelector: [WorkOrderSelectorParams, undefined];
  ItemSelector: [undefined, WorkOrderItem];
  ItemConfig: [WorkOrderItem, { type: 'update' | 'remove'; item: WorkOrderItem }];
  StatusSelector: [undefined, WorkOrderStatus];
  CustomerSelector: [undefined, WorkOrderCustomer];
  ShippingConfig: [undefined, number];
  EmployeeSelector: [undefined, WorkOrderEmployee[]];

  // TODO: Allow custom amounts instead of shortcuts (if settings allow it)
  DiscountOrDepositSelector: [
    { select: 'discount' | 'deposit'; subTotal: number },
    (
      | { select: 'discount' | 'deposit'; type: 'currency'; currencyAmount: number }
      | { select: 'discount' | 'deposit'; type: 'percentage'; percentage: number; currencyAmount: number }
    ),
  ];
};
