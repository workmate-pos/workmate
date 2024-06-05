import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { CreateWorkOrder, Int } from '@web/schemas/generated/create-work-order.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { v4 as uuid } from 'uuid';
import type { useReducer, useRef, useState } from 'react';
import { WorkOrder } from '@web/services/work-orders/types.js';
import { parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';

export type WIPCreateWorkOrder = Omit<CreateWorkOrder, 'customerId'> & {
  customerId: CreateWorkOrder['customerId'] | null;
};

export type CreateWorkOrderAction =
  | ({
      type: 'setPartial';
    } & Partial<CreateWorkOrder>)
  | {
      /**
       * Make sure to upsert charges before adding items
       */
      type: 'addItems';
      items: CreateWorkOrder['items'][number][];
    }
  | {
      type: 'removeItem';
      uuid: string;
    }
  | {
      /**
       * Make sure to upsert charges before updating items
       */
      type: 'updateItem';
      item: CreateWorkOrder['items'][number];
    }
  | {
      type: 'updateItemCharges';
      uuid: string;
      charges: DiscriminatedUnionOmit<CreateWorkOrder['charges'][number], 'workOrderItemUuid'>[];
    }
  | {
      type: 'updateItemCustomFields';
      uuid: string;
      customFields: Record<string, string>;
    }
  | ({
      type: 'set';
    } & WIPCreateWorkOrder);

type CreateWorkOrderActionWithWorkOrder = CreateWorkOrderAction & { workOrder: WorkOrder | null };

export type CreateWorkOrderDispatchProxy = {
  [type in CreateWorkOrderAction['type']]: (args: Omit<CreateWorkOrderAction & { type: type }, 'type'>) => void;
};

export type UseCreateWorkOrderReactContext = {
  useRef: typeof useRef;
  useState: typeof useState;
  useReducer: typeof useReducer;
};

/**
 * We require a WorkOrder object to be able to prevent merging line items that are in an order.
 */
export const useCreateWorkOrderReducer = (
  initialCreateWorkOrder: WIPCreateWorkOrder,
  workOrder: WorkOrder | undefined | null,
  { useState, useRef, useReducer }: UseCreateWorkOrderReactContext,
) => {
  const [createWorkOrder, dispatchCreateWorkOrder] = useReducer(createWorkOrderReducer, initialCreateWorkOrder);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const workOrderRef = useRef(workOrder);
  workOrderRef.current = workOrder;

  const [proxy] = useState(
    () =>
      new Proxy<CreateWorkOrderDispatchProxy>({} as CreateWorkOrderDispatchProxy, {
        get: (target, prop) => (args: DiscriminatedUnionOmit<CreateWorkOrderAction, 'type'>) => {
          if (!workOrderRef.current === undefined) {
            throw new Error('Cannot modify work order because it has not been loaded yet');
          }

          setHasUnsavedChanges(true);
          dispatchCreateWorkOrder({
            type: prop,
            ...args,
            workOrder: workOrderRef.current,
          } as CreateWorkOrderActionWithWorkOrder);
        },
      }),
  );

  return [createWorkOrder, proxy, hasUnsavedChanges, setHasUnsavedChanges] as const;
};

function createWorkOrderReducer(
  createWorkOrder: WIPCreateWorkOrder,
  action: CreateWorkOrderActionWithWorkOrder,
): WIPCreateWorkOrder {
  const { workOrder } = action;

  switch (action.type) {
    case 'setPartial':
    case 'set': {
      const { type, ...partial } = action;
      const partialNotUndefined: Partial<WIPCreateWorkOrder> = Object.fromEntries(
        Object.entries(partial).filter(([, value]) => value !== undefined),
      );

      return { ...createWorkOrder, ...partialNotUndefined };
    }

    case 'updateItemCharges': {
      const charges = [
        ...createWorkOrder.charges.filter(charge => charge.workOrderItemUuid !== action.uuid),
        ...action.charges.map(charge => ({ ...charge, workOrderItemUuid: action.uuid })),
      ];

      const merged = getMergedItems(createWorkOrder.items, charges, workOrder);
      const split = getSplitItems(merged, charges);

      return {
        ...createWorkOrder,
        items: split,
        charges,
      };
    }

    case 'updateItemCustomFields': {
      return {
        ...createWorkOrder,
        items: createWorkOrder.items.map(item => {
          if (item.uuid === action.uuid) {
            return { ...item, customFields: action.customFields };
          }

          return item;
        }),
      };
    }

    case 'updateItem': {
      const updated = createWorkOrder.items.map(item => (item.uuid === action.item.uuid ? action.item : item));
      const merged = getMergedItems(updated, createWorkOrder.charges, workOrder);
      const split = getSplitItems(merged, createWorkOrder.charges);

      return {
        ...createWorkOrder,
        items: split,
      };
    }

    case 'addItems': {
      const merged = getMergedItems([...createWorkOrder.items, ...action.items], createWorkOrder.charges, workOrder);
      const split = getSplitItems(merged, createWorkOrder.charges);

      return {
        ...createWorkOrder,
        items: split,
      };
    }

    case 'removeItem': {
      return {
        ...createWorkOrder,
        items: createWorkOrder.items.filter(item => item.uuid !== action.uuid),
        charges: createWorkOrder.charges.filter(charge => charge.workOrderItemUuid !== action.uuid),
      };
    }

    default:
      return action satisfies never;
  }
}

function shouldMergeItems(
  a: CreateWorkOrder['items'][number],
  b: CreateWorkOrder['items'][number],
  charges: CreateWorkOrder['charges'][number][],
  workOrder: WorkOrder | null,
) {
  if (a.productVariantId !== b.productVariantId) {
    return false;
  }

  if (a.absorbCharges || b.absorbCharges) {
    return false;
  }

  if (
    charges.some(hasPropertyValue('workOrderItemUuid', a.uuid)) ||
    charges.some(hasPropertyValue('workOrderItemUuid', b.uuid))
  ) {
    return false;
  }

  // do not allow merging if either item is in an order
  if (
    [a, b].some(({ uuid }) =>
      isOrderId(workOrder?.items.find(hasPropertyValue('uuid', uuid))?.shopifyOrderLineItem?.orderId),
    )
  ) {
    return false;
  }

  return true;
}

function getMergedItems(
  items: CreateWorkOrder['items'][number][],
  charges: CreateWorkOrder['charges'][number][],
  workOrder: WorkOrder | null,
) {
  const merged: CreateWorkOrder['items'][number][] = [];

  for (const item of items) {
    let found = false;

    for (const existing of merged) {
      if (shouldMergeItems(item, existing, charges, workOrder)) {
        existing.quantity = (existing.quantity + item.quantity) as Int;
        found = true;
        break;
      }
    }

    if (!found) {
      merged.push(item);
    }
  }

  return merged.filter(item => item.quantity > 0);
}

function shouldSplitItem(item: CreateWorkOrder['items'][number], charges: CreateWorkOrder['charges'][number][]) {
  return item.quantity > 1 && charges.some(hasPropertyValue('workOrderItemUuid', item.uuid));
}

function getSplitItems(items: CreateWorkOrder['items'][number][], charges: CreateWorkOrder['charges'][number][]) {
  return items
    .flatMap<CreateWorkOrder['items'][number]>(item => {
      if (!shouldSplitItem(item, charges)) {
        return [item];
      }

      return [
        {
          uuid: item.uuid,
          productVariantId: item.productVariantId,
          quantity: 1 as Int,
          absorbCharges: item.absorbCharges,
          customFields: item.customFields,
        },
        {
          uuid: uuid(),
          productVariantId: item.productVariantId,
          quantity: (item.quantity - 1) as Int,
          absorbCharges: item.absorbCharges,
          customFields: item.customFields,
        },
      ];
    })
    .filter(item => item.quantity > 0);
}

function isOrderId(id: string | undefined) {
  return !!id && parseGid(id).objectName === 'Order';
}
