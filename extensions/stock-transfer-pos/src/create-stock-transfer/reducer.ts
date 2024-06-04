import { useReducer, useState } from 'react';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { CreateStockTransfer, Int, StockTransferLineItem } from '@web/schemas/generated/create-stock-transfer.js';
import { groupBy, sum } from '@teifi-digital/shopify-app-toolbox/array';
import { never } from '@teifi-digital/shopify-app-toolbox/util';

export type WIPCreateStockTransfer = Omit<CreateStockTransfer, 'fromLocationId' | 'toLocationId'> & {
  fromLocationId: CreateStockTransfer['fromLocationId'] | null;
  toLocationId: CreateStockTransfer['toLocationId'] | null;
};

type CreateStockTransferAction =
  | ({ type: 'setPartial' } & Partial<WIPCreateStockTransfer>)
  | ({ type: 'set' } & WIPCreateStockTransfer)
  | { type: 'addLineItems'; lineItems: CreateStockTransfer['lineItems'] }
  | { type: 'removeLineItems'; lineItems: Pick<CreateStockTransfer['lineItems'][number], 'uuid'>[] }
  | { type: 'updateLineItems'; lineItems: CreateStockTransfer['lineItems'] };

export type CreateStockTransferDispatchProxy = {
  [type in CreateStockTransferAction['type']]: (args: Omit<CreateStockTransferAction & { type: type }, 'type'>) => void;
};

export const useCreateStockTransferReducer = (initial: WIPCreateStockTransfer) => {
  const [createStockTransfer, dispatchCreateStockTransfer] = useReducer(createStockTransferReducer, initial);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [proxy] = useState(
    () =>
      new Proxy<CreateStockTransferDispatchProxy>({} as CreateStockTransferDispatchProxy, {
        get: (target, prop) => (args: DiscriminatedUnionOmit<CreateStockTransferAction, 'type'>) => {
          setHasUnsavedChanges(true);
          dispatchCreateStockTransfer({ type: prop, ...args } as CreateStockTransferAction);
        },
      }),
  );

  return [createStockTransfer, proxy, hasUnsavedChanges, setHasUnsavedChanges] as const;
};

export function createStockTransferReducer(
  state: WIPCreateStockTransfer,
  action: CreateStockTransferAction,
): WIPCreateStockTransfer {
  switch (action.type) {
    case 'setPartial':
    case 'set': {
      const { type, ...partial } = action;
      const partialNotUndefined: Partial<WIPCreateStockTransfer> = Object.fromEntries(
        Object.entries(partial).filter(([, value]) => value !== undefined),
      );
      return { ...state, ...partialNotUndefined };
    }

    case 'addLineItems': {
      const { lineItems } = action;
      return { ...state, lineItems: mergeLineItems([...state.lineItems, ...lineItems]) };
    }

    case 'removeLineItems': {
      const uuids = action.lineItems.map(li => li.uuid);
      return { ...state, lineItems: state.lineItems.filter(lineItem => !uuids.includes(lineItem.uuid)) };
    }

    case 'updateLineItems': {
      const uuids = action.lineItems.map(li => li.uuid);
      return {
        ...state,
        lineItems: mergeLineItems([
          ...state.lineItems.filter(lineItem => !uuids.includes(lineItem.uuid)),
          ...action.lineItems,
        ]),
      };
    }
  }
}

function mergeLineItems(lineItems: StockTransferLineItem[]): StockTransferLineItem[] {
  return Object.values(groupBy(lineItems, li => `${li.inventoryItemId}-${li.status}`))
    .map(lineItems => {
      const [lineItem = never()] = lineItems;
      const quantity = sum(lineItems.map(li => li.quantity)) as Int;
      return { ...lineItem, quantity };
    })
    .filter(lineItem => lineItem.quantity > 0);
}
