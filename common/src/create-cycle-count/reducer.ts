import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { CreateCycleCount, DateTime } from '@web/schemas/generated/create-cycle-count.js';
import { useReducer, useRef, useState } from 'react';
import { uuid } from '../util/uuid.js';
import { DiscriminatedUnionOmit } from '../types/DiscriminatedUnionOmit.js';

type ProductVariant = {
  id: ID;
  title: string;
  product: {
    title: string;
  };
  inventoryItem: {
    id: ID;
  };
};

type CreateCycleCountAction =
  | ({ type: 'set' } & CreateCycleCount)
  | ({ type: 'setStatus' } & Pick<CreateCycleCount, 'status'>)
  | ({ type: 'setLocation' } & Pick<CreateCycleCount, 'locationId'>)
  | { type: 'setDueDate'; dueDate: DateTime | null }
  | { type: 'setNote'; note: string }
  | { type: 'setItems'; items: CreateCycleCount['items'] }
  | { type: 'setEmployeeAssignments'; employeeAssignments: CreateCycleCount['employeeAssignments'] }
  | { type: 'setLocked'; locked: boolean }
  | { type: 'importProductVariants'; productVariants: ProductVariant[] }
  | { type: 'addProductVariants'; productVariants: ProductVariant[] };

export type CreateCycleCountDispatchProxy = {
  [type in CreateCycleCountAction['type']]: (
    args: DiscriminatedUnionOmit<CreateCycleCountAction & { type: type }, 'type'>,
  ) => void;
};

export type UseCreateCycleCountReactContext = {
  useRef: typeof useRef;
  useState: typeof useState;
  useReducer: typeof useReducer;
};

function reducer(state: CreateCycleCount, action: CreateCycleCountAction): CreateCycleCount {
  switch (action.type) {
    case 'set':
      return action;
    case 'setStatus':
      return { ...state, status: action.status };
    case 'setLocation':
      return { ...state, locationId: action.locationId };
    case 'setDueDate':
      return { ...state, dueDate: action.dueDate };
    case 'setNote':
      return { ...state, note: action.note };
    case 'setItems':
      return { ...state, items: action.items };
    case 'setEmployeeAssignments':
      return { ...state, employeeAssignments: action.employeeAssignments };
    case 'setLocked':
      return { ...state, locked: action.locked };

    case 'importProductVariants': {
      const knownProductVariantIds = new Set(state.items.map(item => item.productVariantId));

      const items = [
        ...action.productVariants
          .filter(pv => !knownProductVariantIds.has(pv.id))
          .map(pv => ({
            productVariantTitle: pv.title,
            productTitle: pv.product.title,
            uuid: uuid(),
            productVariantId: pv.id,
            countQuantity: 0,
            inventoryItemId: pv.inventoryItem.id,
          })),
        ...state.items,
      ];

      return { ...state, items };
    }

    case 'addProductVariants': {
      const newProductVariantIds = new Set(action.productVariants.map(pv => pv.id));
      const currentProductVariantQuantities = Object.fromEntries(
        state.items.map(item => [item.productVariantId, item.countQuantity]),
      );

      const items = [
        ...action.productVariants.map(pv => ({
          productVariantTitle: pv.title,
          productTitle: pv.product.title,
          uuid: uuid(),
          productVariantId: pv.id,
          countQuantity: (currentProductVariantQuantities[pv.id] ?? 0) + 1,
          inventoryItemId: pv.inventoryItem.id,
        })),
        ...state.items.filter(item => !newProductVariantIds.has(item.productVariantId)),
      ];

      return { ...state, items };
    }

    default:
      return action satisfies never;
  }
}

export function useCreateCycleCountReducer(
  initialState: CreateCycleCount,
  { useState, useRef, useReducer }: UseCreateCycleCountReactContext,
) {
  const [createCycleCount, dispatchCreateCycleCount] = useReducer(reducer, initialState);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const proxy = useRef(
    new Proxy<CreateCycleCountDispatchProxy>({} as CreateCycleCountDispatchProxy, {
      get: (target, prop) => (args: DiscriminatedUnionOmit<CreateCycleCountAction, 'type'>) => {
        setHasUnsavedChanges(true);
        dispatchCreateCycleCount({ type: prop, ...args } as CreateCycleCountAction);
      },
    }),
  ).current;

  return [createCycleCount, proxy, hasUnsavedChanges, setHasUnsavedChanges] as const;
}
