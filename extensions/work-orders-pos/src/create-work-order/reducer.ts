import { useReducer } from 'react';
import { defaultCreateWorkOrder } from './default.js';
import { Nullable } from '@work-orders/common/types/Nullable.js';
import type { CreateWorkOrder, Int } from '@web/schemas/generated/create-work-order.js';
import { CreateWorkOrderEmployeeAssignment, CreateWorkOrderLineItem } from '../screens/routes.js';

export type CreateWorkOrderAction =
  | { type: 'reset-work-order' }
  | {
      type: 'set-work-order';
      workOrder: Nullable<CreateWorkOrder>;
    }
  | {
      type: 'remove-line-item' | 'update-line-item';
      lineItem: CreateWorkOrderLineItem;
    }
  | {
      type: 'add-line-item';
      lineItem: CreateWorkOrderLineItem;
      /**
       * Whether to allow merging the line item with an existing one.
       */
      allowMerge: boolean;
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

    case 'add-line-item': {
      if (action.allowMerge) {
        const productVariantId = action.lineItem.productVariantId;
        const existingProductVariantLineItem = workOrder.lineItems?.find(
          item => item.productVariantId === productVariantId,
        );

        if (existingProductVariantLineItem) {
          action.lineItem = {
            ...existingProductVariantLineItem,
            quantity: (existingProductVariantLineItem.quantity + action.lineItem.quantity) as Int,
          };
        }
      }

      const lineItemUuid = action.lineItem.uuid;

      return {
        ...workOrder,
        lineItems: [
          ...(workOrder.lineItems?.filter(lineItem => lineItem.uuid !== lineItemUuid) ?? []),
          action.lineItem,
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

    case 'update-line-item': {
      const updateItem = action.lineItem;
      return {
        ...workOrder,
        lineItems: (workOrder.lineItems ?? []).map(item => (item.uuid === updateItem.uuid ? updateItem : item)),
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
