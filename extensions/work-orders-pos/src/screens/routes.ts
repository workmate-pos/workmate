import type {
  WorkOrder,
  WorkOrderCustomer,
  WorkOrderEmployeeAssignment,
  WorkOrderProduct,
  WorkOrderService,
  WorkOrderServiceEmployeeAssignment,
} from '../types/work-order';

/**
 * Screen input/output types.
 * Used by useScreen to make navigation type-safe.
 */
export type ScreenInputOutput = {
  Entry: [undefined, undefined];
  ImportOrderSelector: [undefined, undefined];
  WorkOrder: [
    (
      | {
          type: 'load-work-order';
          name: string;
        }
      | {
          type: 'new-work-order';
          initial?: Partial<WorkOrder>;
        }
    ),
    undefined,
  ];
  ProductSelector: [undefined, WorkOrderProduct];
  ProductConfig: [WorkOrderProduct, { type: 'update' | 'remove'; product: WorkOrderProduct }];
  ServiceSelector: [undefined, WorkOrderService];
  ServiceConfig: [WorkOrderService, { type: 'update' | 'remove'; service: WorkOrderService }];
  StatusSelector: [undefined, string];
  ServiceEmployeeAssignmentConfig: [
    WorkOrderServiceEmployeeAssignment,
    { type: 'update' | 'remove'; assignment: WorkOrderServiceEmployeeAssignment },
  ];
  CustomerSelector: [undefined, WorkOrderCustomer];
  ShippingConfig: [undefined, number];
  EmployeeSelector: [{ selectedEmployeeIds: string[] }, (WorkOrderEmployeeAssignment & { employeeRate: number })[]];
  DiscountOrDepositSelector: [
    { select: 'discount' | 'deposit'; subTotal: number },
    (
      | { select: 'discount' | 'deposit'; type: 'currency'; currencyAmount: number }
      | { select: 'discount' | 'deposit'; type: 'percentage'; percentage: number; currencyAmount: number }
    ),
  ];
  WorkOrderOverview: [{ name: string }, { saved: true; name: string } | { saved: false }];
  WorkOrderSaved: [WorkOrder, undefined];
};
