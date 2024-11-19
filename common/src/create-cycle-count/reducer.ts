import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { CreateCycleCount, DateTime } from '@web/schemas/generated/create-cycle-count.js';
import { useReducer, useRef, useState } from 'react';
import { uuid } from '../util/uuid.js';
import { DiscriminatedUnionOmit } from '../types/DiscriminatedUnionOmit.js';

type CreateCycleCountAction =
  | ({ type: 'set' } & CreateCycleCount)
  | ({ type: 'setStatus' } & Pick<CreateCycleCount, 'status'>)
  | ({ type: 'setLocation' } & Pick<CreateCycleCount, 'locationId'>)
  | { type: 'setDueDate'; dueDate: DateTime | null }
  | { type: 'setNote'; note: string }
  | { type: 'setItems'; items: CreateCycleCount['items'] }
  | { type: 'setEmployeeAssignments'; employeeAssignments: CreateCycleCount['employeeAssignments'] }
  | { type: 'setLocked'; locked: boolean }
  | {
      type: 'addProductVariants';
      productVariants: {
        id: ID;
        title: string;
        product: {
          title: string;
        };
        inventoryItem: {
          id: ID;
        };
      }[];
    };

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
    case 'addProductVariants':
      return {
        ...state,
        items: [
          ...state.items,
          ...action.productVariants.map(variant => ({
            uuid: uuid(),
            productVariantId: variant.id,
            inventoryItemId: variant.inventoryItem.id,
            countQuantity: 0,
            productTitle: variant.product.title,
            productVariantTitle: variant.title,
          })),
        ],
      };
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
