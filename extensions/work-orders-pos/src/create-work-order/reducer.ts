import { useReducer } from 'react';
import { defaultCreateWorkOrder } from './default.js';
import { Nullable } from '@work-orders/common/types/Nullable.js';
import type { CreateWorkOrder, Int } from '@web/schemas/generated/create-work-order.js';
import { CreateWorkOrderEmployeeAssignment, CreateWorkOrderLineItem } from '../screens/routes.js';
import { uuid } from '../util/uuid.js';

export type CreateWorkOrderAction =
  | { type: 'reset-work-order' }
  | {
      type: 'set-work-order';
      workOrder: Nullable<CreateWorkOrder>;
    }
  | {
      type: 'remove-line-item';
      lineItem: CreateWorkOrderLineItem;
    }
  | {
      type: 'upsert-line-item';
      lineItem: CreateWorkOrderLineItem;
      /**
       * Indicates whether this line item is a service item.
       * Service items can never have a quantity greater than 1.
       */
      isService: boolean;
    }
  | NonNullable<
      {
        [key in keyof CreateWorkOrder]: {
          type: 'set-field';
          field: key;
          value: CreateWorkOrder[key];
        };
      }[keyof CreateWorkOrder]
    >
  | {
      type: 'set-assigned-employees';
      employees: CreateWorkOrderEmployeeAssignment[];
    };

export const useCreateWorkOrderReducer = () => useReducer(createWorkOrderReducer, defaultCreateWorkOrder);

const createWorkOrderReducer = (
  workOrder: Nullable<CreateWorkOrder>,
  action: CreateWorkOrderAction,
): Nullable<CreateWorkOrder> => {
  switch (action.type) {
    case 'reset-work-order':
      return defaultCreateWorkOrder;

    case 'set-work-order':
      return action.workOrder;

    case 'upsert-line-item': {
      const lineItemUuid = action.lineItem.uuid;

      const hasEmployeeAssignments = workOrder.employeeAssignments?.find(ea => ea.lineItemUuid === lineItemUuid);

      // Stack items if possible.
      if (!action.isService && !hasEmployeeAssignments) {
        const stackableProductVariantLineItem = workOrder.lineItems?.find(
          item =>
            item.productVariantId === action.lineItem.productVariantId &&
            // We can only stack when there are no assigned employees.
            !workOrder.employeeAssignments?.find(ea => ea.lineItemUuid === item.uuid) &&
            // In case of update, don't merge with the item itself.
            item.uuid !== lineItemUuid,
        );

        if (stackableProductVariantLineItem) {
          action.lineItem = {
            ...stackableProductVariantLineItem,
            quantity: (stackableProductVariantLineItem.quantity + action.lineItem.quantity) as Int,
          };
        }
      }

      const newLineItems: CreateWorkOrderLineItem[] = [];

      // Un-stack line items when adding employees.
      if (action.lineItem.quantity > 1 && hasEmployeeAssignments) {
        newLineItems.push(
          {
            productVariantId: action.lineItem.productVariantId,
            uuid: uuid(),
            quantity: (action.lineItem.quantity - 1) as Int,
          },
          {
            productVariantId: action.lineItem.productVariantId,
            uuid: action.lineItem.uuid,
            quantity: 1 as Int,
          },
        );
      } else {
        newLineItems.push(action.lineItem);
      }

      return {
        ...workOrder,
        lineItems: [
          ...(workOrder.lineItems?.filter(
            lineItem => ![lineItemUuid, ...newLineItems.map(li => li.uuid)].includes(lineItem.uuid),
          ) ?? []),
          ...newLineItems,
        ],
      };
    }

    case 'remove-line-item': {
      const itemUuid = action.lineItem.uuid;
      return {
        ...workOrder,
        lineItems: (workOrder.lineItems ?? []).filter(item => item.uuid !== itemUuid),
        employeeAssignments: (workOrder.employeeAssignments ?? []).filter(
          assignment => assignment.lineItemUuid !== itemUuid,
        ),
      };
    }

    case 'set-assigned-employees':
      return {
        ...workOrder,
        employeeAssignments: action.employees,
      };

    case 'set-field':
      return {
        ...workOrder,
        [action.field]: action.value,
      };

    default:
      return action satisfies never;
  }
};
