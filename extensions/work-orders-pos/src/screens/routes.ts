import type { WorkOrderSelectorParams } from './popups/WorkOrderSelector';
import type { WorkOrderItem } from './WorkOrder';

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
  EmployeeSelector: [undefined, { id: number; name: string }];
};
