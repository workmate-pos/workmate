import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { CreateWorkOrder, Int } from '@web/schemas/generated/create-work-order.js';
import { v4 as uuid } from 'uuid';
import type { useReducer, useRef, useState } from 'react';
import { WorkOrder } from '@web/services/work-orders/types.js';
import { parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';

export type WIPCreateWorkOrder = Omit<CreateWorkOrder, 'customerId'> & {
  customerId: CreateWorkOrder['customerId'] | null;
};

type ItemDescriptor = {
  type: 'product' | 'custom-item';
  uuid: string;
};

export type CreateWorkOrderAction =
  | ({
      type: 'setPartial';
    } & Partial<CreateWorkOrder>)
  | ({
      type: 'setCompany';
    } & Pick<CreateWorkOrder, 'companyId' | 'companyLocationId' | 'companyContactId' | 'customerId'>)
  | ({
      type: 'setCustomer';
    } & Pick<CreateWorkOrder, 'customerId'>)
  | {
      /**
       * Make sure to upsert charges before adding items
       */
      type: 'addItems';
      items: CreateWorkOrder['items'][number][];
    }
  | {
      type: 'removeItem';
      item: ItemDescriptor;
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
      item: ItemDescriptor;
      charges: DiscriminatedUnionOmit<CreateWorkOrder['charges'][number], 'workOrderItem'>[];
    }
  | {
      type: 'updateItemCustomFields';
      item: ItemDescriptor;
      customFields: Record<string, string>;
    }
  | ({
      type: 'set';
    } & WIPCreateWorkOrder);

type CreateWorkOrderActionWithWorkOrder = CreateWorkOrderAction & {
  workOrder: WorkOrder | null;
};

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
          const workOrder = workOrderRef.current;

          if (workOrder === undefined) {
            throw new Error('Cannot modify work order because it has not been loaded yet');
          }

          setHasUnsavedChanges(true);
          dispatchCreateWorkOrder({
            type: prop,
            ...args,
            workOrder,
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
    case 'setCompany':
    case 'setCustomer':
    case 'setPartial':
    case 'set': {
      const { type, workOrder, ...partial } = action;
      const partialNotUndefined: Partial<WIPCreateWorkOrder> = Object.fromEntries(
        Object.entries(partial).filter(([, value]) => value !== undefined),
      );

      if (action.type === 'setCustomer') {
        partialNotUndefined.companyId = null;
        partialNotUndefined.companyLocationId = null;
        partialNotUndefined.companyContactId = null;
      }

      return { ...createWorkOrder, ...partialNotUndefined };
    }

    case 'updateItemCharges': {
      const charges = [
        ...createWorkOrder.charges.filter(
          charge =>
            !(charge.workOrderItem?.uuid === action.item.uuid && charge.workOrderItem?.type === action.item.type),
        ),
        ...action.charges.map(charge => ({
          ...charge,
          workOrderItem: { type: action.item.type, uuid: action.item.uuid },
        })),
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
          if (item.uuid === action.item.uuid && item.type === action.item.type) {
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
        items: createWorkOrder.items.filter(
          item => !(item.uuid === action.item.uuid && item.type === action.item.type),
        ),
        charges: createWorkOrder.charges.filter(
          charge =>
            !(charge.workOrderItem?.type === action.item.type && charge.workOrderItem?.uuid === action.item.uuid),
        ),
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
  if (a.type !== b.type) {
    return false;
  }

  if (a.type === 'custom-item' || b.type === 'custom-item') {
    return false;
  }

  if (a.productVariantId !== b.productVariantId) {
    return false;
  }

  if (a.absorbCharges || b.absorbCharges) {
    return false;
  }

  const itemHasCharges = (item: { type: 'product' | 'custom-item'; uuid: string }) =>
    charges.some(charge => charge.workOrderItem?.uuid === item.uuid && charge.workOrderItem.type === item.type);

  if ([a, b].some(itemHasCharges)) {
    return false;
  }

  const itemIsInOrder = (item: { type: 'product' | 'custom-item'; uuid: string }) =>
    workOrder?.items.some(
      oi => oi.type === item.type && oi.uuid === item.uuid && isOrderId(oi.shopifyOrderLineItem?.orderId),
    ) ?? false;

  // do not allow merging if either item is in an order
  if ([a, b].some(itemIsInOrder)) {
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
  return (
    item.quantity > 1 &&
    charges.some(charge => charge.workOrderItem?.uuid === item.uuid && charge.workOrderItem.type === item.type)
  );
}

function getSplitItems(items: CreateWorkOrder['items'][number][], charges: CreateWorkOrder['charges'][number][]) {
  return items
    .flatMap<CreateWorkOrder['items'][number]>(item => {
      if (!shouldSplitItem(item, charges)) {
        return [item];
      }

      return [
        {
          ...item,
          quantity: 1 as Int,
        },
        {
          ...item,
          uuid: uuid(),
          quantity: (item.quantity - 1) as Int,
        },
      ];
    })
    .filter(item => item.quantity > 0);
}

function isOrderId(id: string | undefined) {
  try {
    return !!id && parseGid(id).objectName === 'Order';
  } catch (e) {
    return true;
  }
}
