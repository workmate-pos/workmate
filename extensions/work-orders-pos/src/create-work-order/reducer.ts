import { useReducer } from 'react';
import { defaultCreateWorkOrder } from './default.js';
import { Nullable } from '@work-orders/common/types/Nullable.js';
import type { CreateWorkOrder, Int } from '@web/schemas/generated/create-work-order.js';
import { CreateWorkOrderLineItem } from '../types.js';
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
      isUnstackable: boolean;
    }
  | NonNullable<
      {
        [key in keyof CreateWorkOrder]: {
          type: 'set-field';
          field: key;
          value: CreateWorkOrder[key];
        };
      }[keyof CreateWorkOrder]
    >;

export const useCreateWorkOrderReducer = (initial?: Partial<CreateWorkOrder>) => {
  const initialExceptUndefined = Object.fromEntries(
    Object.entries(initial ?? {}).filter(([, value]) => value !== undefined),
  );
  return useReducer(createWorkOrderReducer, { ...defaultCreateWorkOrder, ...initialExceptUndefined });
};

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
      const lineItemUuidHasCharges = (lineItemUuid: string) =>
        (workOrder.charges ?? []).find(l => l.lineItemUuid === lineItemUuid);

      const hasCharges = lineItemUuidHasCharges(action.lineItem.uuid);

      if (hasCharges) {
        // Un-stack line items when adding charges
        if (action.lineItem.quantity > 1) {
          return {
            ...workOrder,
            lineItems: [
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
              ...(workOrder.lineItems ?? []).filter(li => li.uuid !== action.lineItem.uuid),
            ],
          };
        }

        return {
          ...workOrder,
          lineItems: [action.lineItem, ...(workOrder.lineItems ?? []).filter(li => li.uuid !== action.lineItem.uuid)],
        };
      }

      const originalLineItemUuid = action.lineItem.uuid;

      // Stack items if possible.
      if (!action.isUnstackable) {
        const stack = workOrder.lineItems?.find(
          li =>
            li.productVariantId === action.lineItem.productVariantId &&
            // We can only stack when there is no assigned charge.
            !lineItemUuidHasCharges(li.uuid) &&
            // In case of update, don't merge with the item itself.
            li.uuid !== action.lineItem.uuid,
        );

        if (stack) {
          action.lineItem = {
            ...stack,
            quantity: (stack.quantity + action.lineItem.quantity) as Int,
          };
        }
      }

      return {
        ...workOrder,
        lineItems: [
          action.lineItem,
          ...(workOrder.lineItems ?? []).filter(
            li => li.uuid !== originalLineItemUuid && li.uuid !== action.lineItem.uuid,
          ),
        ],
      };
    }

    case 'remove-line-item': {
      const itemUuid = action.lineItem.uuid;
      return {
        ...workOrder,
        lineItems: (workOrder.lineItems ?? []).filter(item => item.uuid !== itemUuid),
        charges: (workOrder.charges ?? []).filter(charge => charge.lineItemUuid !== itemUuid),
      };
    }

    case 'set-field':
      return {
        ...workOrder,
        [action.field]: action.value,
      };

    default:
      return action satisfies never;
  }
};
