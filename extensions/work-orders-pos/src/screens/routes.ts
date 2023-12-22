import type { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';
import type { ID } from '@web/schemas/generated/create-work-order-request.js';
import { Nullable } from '@work-orders/common/types/Nullable.js';
import { WorkOrder } from '@web/services/work-orders/types.js';

export type CreateWorkOrderLineItem = CreateWorkOrder['lineItems'][number];
export type CreateWorkOrderEmployeeAssignment = CreateWorkOrder['employeeAssignments'][number];

/**
 * Screen input/output types.
 * Used by useScreen to make navigation type-safe.
 */
export type ScreenInputOutput = {
  Entry: [undefined, undefined];
  Error: [string, undefined];
  ImportOrderSelector: [undefined, undefined];
  // TODO: Create this
  OrderPreview: [
    {
      orderId: ID;
      /**
       * Shows "Import Order" button.
       * Only used when importing from an existing order, and should be false when simply viewing the derived from order of a work order.
       */
      showImportButton: boolean;
      /**
       * Whether to warn about unsaved changes when navigating away from this screen.
       */
      unsavedChanges: boolean;
    },
    undefined,
  ];
  WorkOrder: [
    (
      | {
          type: 'load-work-order';
          name: string;
        }
      | {
          type: 'new-work-order';
          initial?: Partial<Nullable<CreateWorkOrder>>;
        }
    ),
    undefined,
  ];
  ProductSelector: [undefined, CreateWorkOrderLineItem];
  ServiceSelector: [undefined, CreateWorkOrderLineItem];
  ServiceLineItemConfig: [
    {
      readonly: boolean;
      lineItem: CreateWorkOrderLineItem;
      employeeAssignments: Omit<CreateWorkOrderEmployeeAssignment, 'lineItemUuid'>[];
    },
    {
      type: 'update' | 'remove';
      lineItem: CreateWorkOrderLineItem;
      employeeAssignments: Omit<CreateWorkOrderEmployeeAssignment, 'lineItemUuid'>[];
    },
  ];
  ProductLineItemConfig: [
    {
      readonly: boolean;
      lineItem: CreateWorkOrderLineItem;
    },
    { type: 'remove' | 'update'; lineItem: CreateWorkOrderLineItem },
  ];
  StatusSelector: [undefined, string];
  CustomerSelector: [undefined, ID];
  ShippingConfig: [undefined, number];
  EmployeeSelector: [ID[], ID[]];
  EmployeeAssignmentsConfig: [
    Omit<CreateWorkOrderEmployeeAssignment, 'lineItemUuid'>[],
    Omit<CreateWorkOrderEmployeeAssignment, 'lineItemUuid'>[],
  ];
  EmployeeAssignmentConfig: [
    Omit<CreateWorkOrderEmployeeAssignment, 'lineItemUuid'>,
    { type: 'remove' | 'update'; employeeAssignment: Omit<CreateWorkOrderEmployeeAssignment, 'lineItemUuid'> },
  ];
  DiscountSelector: [{ subTotal: number }, CreateWorkOrder['discount']];
  WorkOrderSaved: [WorkOrder, undefined];
};
