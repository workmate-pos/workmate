import type { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';
import type { ID } from '@web/schemas/generated/create-work-order.js';
import { Nullable } from '@work-orders/common/types/Nullable.js';
import { WorkOrder } from '@web/services/work-orders/types.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';

export type CreateWorkOrderLineItem = CreateWorkOrder['lineItems'][number];
export type CreateWorkOrderLabour = CreateWorkOrder['labour'][number];

/**
 * Screen input/output types.
 * Used by useScreen to make navigation type-safe.
 */
export type ScreenInputOutput = {
  Entry: [undefined, undefined];
  Error: [string, undefined];
  ImportOrderSelector: [undefined, undefined];
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
  ProductSelector: [undefined, CreateWorkOrderLineItem[]];
  ServiceSelector: [undefined, CreateWorkOrderLineItem];
  LabourLineItemConfig: [
    {
      readonly: boolean;
      // TODO: A way to see the input in usePopup callback - then we can just directly access this lineItem instead of having to pass it around
      lineItem: CreateWorkOrderLineItem;
      labour: DiscriminatedUnionOmit<CreateWorkOrderLabour, 'lineItemUuid'>[];
    },
    (
      | {
          type: 'update';
          lineItem: CreateWorkOrderLineItem;
          labour: DiscriminatedUnionOmit<CreateWorkOrderLabour, 'lineItemUuid'>[];
        }
      | {
          type: 'remove';
          lineItem: CreateWorkOrderLineItem;
          labour: Pick<CreateWorkOrderLabour, 'labourUuid'>[];
        }
    ),
  ];
  ProductLineItemConfig: [
    {
      readonly: boolean;
      lineItem: CreateWorkOrderLineItem;
    },
    { type: 'remove' | 'update' | 'assign-employees'; lineItem: CreateWorkOrderLineItem },
  ];
  StatusSelector: [undefined, string];
  CustomerSelector: [undefined, ID];
  ShippingConfig: [undefined, number];
  EmployeeSelector: [ID[], ID[]];
  EmployeeLabourConfig: [
    {
      labourUuid: string;
      employeeId: ID;
      labour: DiscriminatedUnionOmit<CreateWorkOrderLabour, 'lineItemUuid' | 'employeeId' | 'labourUuid'>;
    },
    (
      | {
          type: 'update';
          labourUuid: string;
          employeeId: ID;
          labour: DiscriminatedUnionOmit<CreateWorkOrderLabour, 'lineItemUuid' | 'employeeId' | 'labourUuid'>;
        }
      | {
          type: 'remove';
          labourUuid: string;
        }
    ),
  ];
  DiscountSelector: [{ subTotal: number }, CreateWorkOrder['discount']];
  WorkOrderSaved: [WorkOrder, undefined];
};
