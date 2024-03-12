import { useReducer, useState } from 'react';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { CreateWorkOrder, Int } from '@web/schemas/generated/create-work-order.js';
import { CreateWorkOrderCharge, CreateWorkOrderItem } from '../types.js';
import { useConst } from '@work-orders/common-pos/hooks/use-const.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { uuid } from '../util/uuid.js';

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
      items: CreateWorkOrderItem[];
    }
  | {
      type: 'removeItems';
      items: CreateWorkOrderItem[];
    }
  | {
      /**
       * Make sure to upsert charges before updating items
       */
      type: 'updateItem';
      item: CreateWorkOrderItem;
    }
  | {
      type: 'updateItemCharges';
      item: Pick<CreateWorkOrderItem, 'uuid'>;
      charges: DiscriminatedUnionOmit<CreateWorkOrderCharge, 'workOrderItemUuid'>[];
    }
  | ({
      type: 'set';
    } & CreateWorkOrder);

export type CreateWorkOrderDispatchProxy = {
  [type in CreateWorkOrderAction['type']]: (args: Omit<CreateWorkOrderAction & { type: type }, 'type'>) => void;
};

export const useCreateWorkOrderReducer = (initialCreateWorkOrder: WIPCreateWorkOrder) => {
  const [createWorkOrder, dispatchCreateWorkOrder] = useReducer(createWorkOrderReducer, initialCreateWorkOrder);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const proxy = useConst(
    () =>
      new Proxy<CreateWorkOrderDispatchProxy>({} as CreateWorkOrderDispatchProxy, {
        get: (target, prop) => (args: DiscriminatedUnionOmit<CreateWorkOrderAction, 'type'>) => {
          setHasUnsavedChanges(true);
          dispatchCreateWorkOrder({ type: prop, ...args } as CreateWorkOrderAction);
        },
      }),
  );

  return [createWorkOrder, proxy, hasUnsavedChanges, setHasUnsavedChanges] as const;
};

function createWorkOrderReducer(
  createWorkOrder: WIPCreateWorkOrder,
  action: CreateWorkOrderAction,
): WIPCreateWorkOrder {
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
        ...createWorkOrder.charges.filter(charge => charge.workOrderItemUuid !== action.item.uuid),
        ...action.charges.map(charge => ({ ...charge, workOrderItemUuid: action.item.uuid })),
      ];

      const merged = getMergedItems(createWorkOrder.items, charges);
      const split = getSplitItems(merged, charges);

      return {
        ...createWorkOrder,
        items: split.filter(item => item.quantity > 0),
        charges,
      };
    }

    case 'updateItem': {
      const updated = createWorkOrder.items.map(item => (item.uuid === action.item.uuid ? action.item : item));
      const merged = getMergedItems(updated, createWorkOrder.charges);
      const split = getSplitItems(merged, createWorkOrder.charges);

      return {
        ...createWorkOrder,
        items: split.filter(item => item.quantity > 0),
      };
    }

    case 'addItems': {
      const merged = getMergedItems([...createWorkOrder.items, ...action.items], createWorkOrder.charges);
      const split = getSplitItems(merged, createWorkOrder.charges);

      return {
        ...createWorkOrder,
        items: split.filter(item => item.quantity > 0),
      };
    }

    case 'removeItems': {
      const removedItemUuids = new Set(action.items.map(item => item.uuid));

      return {
        ...createWorkOrder,
        items: createWorkOrder.items.filter(item => !action.items.includes(item)),
        charges: createWorkOrder.charges.filter(
          charge => !charge.workOrderItemUuid || !removedItemUuids.has(charge.workOrderItemUuid),
        ),
      };
    }

    default:
      return action satisfies never;
  }
}

function shouldMergeItems(a: CreateWorkOrderItem, b: CreateWorkOrderItem, charges: CreateWorkOrderCharge[]) {
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

  // TODO: dont merge if the charge has an associated order line item - make sure that the reducer gets a list of uuids that are in orders

  return true;
}

function getMergedItems(items: CreateWorkOrderItem[], charges: CreateWorkOrderCharge[]) {
  const merged: CreateWorkOrderItem[] = [];

  for (const item of items) {
    let found = false;

    for (const existing of merged) {
      if (shouldMergeItems(item, existing, charges)) {
        existing.quantity = (existing.quantity + item.quantity) as Int;
        found = true;
        break;
      }
    }

    if (!found) {
      merged.push(item);
    }
  }

  return merged;
}

function shouldSplitItem(item: CreateWorkOrderItem, charges: CreateWorkOrderCharge[]) {
  return item.quantity > 1 && charges.some(hasPropertyValue('workOrderItemUuid', item.uuid));
}

function getSplitItems(items: CreateWorkOrderItem[], charges: CreateWorkOrderCharge[]) {
  return items.flatMap<CreateWorkOrderItem>(item => {
    if (!shouldSplitItem(item, charges)) {
      return [item];
    }

    return [
      {
        ...item,
        quantity: 1 as Int,
      },
      {
        uuid: uuid(),
        productVariantId: item.productVariantId,
        quantity: (item.quantity - 1) as Int,
        absorbCharges: item.absorbCharges,
      },
    ];
  });
}
