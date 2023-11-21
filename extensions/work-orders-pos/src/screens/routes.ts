import type { WorkOrder, WorkOrderCustomer, WorkOrderEmployee, WorkOrderItem, WorkOrderStatus } from './WorkOrder';

/**
 * Screen input/output types.
 * Used by useScreen to make navigation type-safe.
 */
export type ScreenInputOutput = {
  Entry: [{ forceReload?: boolean } | undefined, undefined];
  WorkOrder: [{ type: 'load-work-order'; name: string } | { type: 'new-work-order' }, undefined];
  ItemSelector: [undefined, WorkOrderItem];
  ItemConfig: [WorkOrderItem, { type: 'update' | 'remove'; item: WorkOrderItem }];
  StatusSelector: [undefined, WorkOrderStatus];
  CustomerSelector: [undefined, WorkOrderCustomer];
  ShippingConfig: [undefined, number];
  EmployeeSelector: [{ selectedEmployeeIds: string[] }, WorkOrderEmployee[]];
  DiscountOrDepositSelector: [
    { select: 'discount' | 'deposit'; subTotal: number },
    (
      | { select: 'discount' | 'deposit'; type: 'currency'; currencyAmount: number }
      | { select: 'discount' | 'deposit'; type: 'percentage'; percentage: number; currencyAmount: number }
    ),
  ];
  WorkOrderOverview: [Partial<WorkOrder>, undefined];
};
