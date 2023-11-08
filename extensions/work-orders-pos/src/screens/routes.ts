import type { WorkOrderCustomer, WorkOrderEmployee, WorkOrderItem, WorkOrderStatus } from './WorkOrder';
import type { WorkOrderSelectorParams } from './popups/WorkOrderSelector';

/**
 * Screen input/output types.
 * Used by useScreen to make navigation type-safe.
 */
export type ScreenInputOutput = {
  Entry: [undefined, undefined];
  WorkOrder: [undefined, undefined];
  WorkOrderSelector: [WorkOrderSelectorParams, undefined];
  ItemSelector: [undefined, WorkOrderItem];
  ItemConfig: [WorkOrderItem, { type: 'update' | 'remove'; item: WorkOrderItem }];
  StatusSelector: [undefined, WorkOrderStatus];
  CustomerSelector: [undefined, WorkOrderCustomer];
  ShippingConfig: [undefined, number];

  // TODO: Allow selecting multiple employees
  EmployeeSelector: [undefined, WorkOrderEmployee[]];

  // TODO: Deduplicate these (literally identical except for names)
  // TODO: Allow custom amounts instead of shortcuts (if settings allow it)
  DepositSelector: [
    { subTotal: number },
    { type: 'currency'; currencyAmount: number } | { type: 'percentage'; percentage: number; currencyAmount: number },
  ];
  DiscountSelector: [
    { subTotal: number },
    { type: 'currency'; currencyAmount: number } | { type: 'percentage'; percentage: number; currencyAmount: number },
  ];
};
