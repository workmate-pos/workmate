import type { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';
import type { ID } from '@web/schemas/generated/create-work-order.js';
import { Nullable } from '@work-orders/common/types/Nullable.js';
import { WorkOrder } from '@web/services/work-orders/types.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';

export type CreateWorkOrderLineItem = CreateWorkOrder['lineItems'][number];
export type CreateWorkOrderCharge = CreateWorkOrder['charges'][number];

/**
 * Screen input/output types.
 * Used by useScreen to make navigation type-safe.
 */
export type ScreenInputOutput = {
  Entry: [undefined, undefined];
  Error: [string, undefined];
  LoadingSettings: [undefined, undefined];
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
  ProductSelector: [undefined, { lineItems: CreateWorkOrderLineItem[]; charges: CreateWorkOrderCharge[] }];
  ServiceSelector: [
    undefined,
    { type: 'mutable-service' | 'fixed-service'; lineItem: CreateWorkOrderLineItem; charges: CreateWorkOrderCharge[] },
  ];
  LabourLineItemConfig: [
    {
      readonly: boolean;
      /**
       * Whether to include the product variant price in the shown price.
       * This should be false for mutable services, as they have no base price.
       */
      hasBasePrice: boolean;
      // TODO: A way to see the input in usePopup callback - then we can just directly access this lineItem instead of having to pass it around
      lineItem: CreateWorkOrderLineItem;
      labour: DiscriminatedUnionOmit<CreateWorkOrderCharge, 'lineItemUuid'>[];
    },
    (
      | {
          type: 'update';
          lineItem: CreateWorkOrderLineItem;
          labour: DiscriminatedUnionOmit<CreateWorkOrderCharge, 'lineItemUuid'>[];
        }
      | {
          type: 'remove';
          lineItem: CreateWorkOrderLineItem;
        }
    ),
  ];
  LineItemConfig: [
    {
      readonly: boolean;
      canAddLabour: boolean;
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
      chargeUuid: string;
      employeeId: ID;
      labour: DiscriminatedUnionOmit<CreateWorkOrderCharge, 'lineItemUuid' | 'employeeId' | 'chargeUuid'>;
    },
    (
      | {
          type: 'update';
          chargeUuid: string;
          employeeId: ID;
          labour: DiscriminatedUnionOmit<CreateWorkOrderCharge, 'lineItemUuid' | 'employeeId' | 'chargeUuid'>;
        }
      | {
          type: 'remove';
          chargeUuid: string;
        }
    ),
  ];
  DiscountSelector: [{ subTotal: Money }, CreateWorkOrder['discount']];
  WorkOrderSaved: [WorkOrder, undefined];
};