import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { CreateCycleCount, DateTime } from '@web/schemas/generated/create-cycle-count.js';
import { DetailedCycleCount } from '@web/services/cycle-count/types.js';
import { Dispatch, useEffect, useReducer, useRef, useState } from 'react';
import { uuid } from '../util/uuid.js';

export type WIPCreateCycleCount = CreateCycleCount & {
  name: string | null;
};

type Action =
  | { type: 'SET'; payload: WIPCreateCycleCount }
  | { type: 'SET_STATUS'; payload: { status: string } }
  | { type: 'SET_LOCATION'; payload: { locationId: ID } }
  | { type: 'SET_DUE_DATE'; payload: { dueDate: DateTime | null } }
  | { type: 'SET_NOTE'; payload: { note: string } }
  | { type: 'SET_ITEMS'; payload: { items: WIPCreateCycleCount['items'] } }
  | { type: 'SET_EMPLOYEE_ASSIGNMENTS'; payload: { employeeAssignments: WIPCreateCycleCount['employeeAssignments'] } }
  | { type: 'SET_LOCKED'; payload: { locked: boolean } }
  | {
      type: 'ADD_PRODUCT_VARIANTS';
      payload: {
        productVariants: Array<{
          id: ID;
          title: string;
          product: {
            title: string;
          };
          inventoryItem: {
            id: ID;
          };
        }>;
      };
    };

export type CreateCycleCountDispatch = {
  set: (cycleCount: WIPCreateCycleCount | DetailedCycleCount) => void;
  setStatus: (payload: { status: string }) => void;
  setLocation: (payload: { locationId: ID }) => void;
  setDueDate: (payload: { dueDate: DateTime | null }) => void;
  setNote: (payload: { note: string }) => void;
  setItems: (payload: { items: WIPCreateCycleCount['items'] }) => void;
  setEmployeeAssignments: (payload: { employeeAssignments: WIPCreateCycleCount['employeeAssignments'] }) => void;
  setLocked: (payload: { locked: boolean }) => void;
  addProductVariants: (payload: {
    productVariants: Array<{
      id: ID;
      title: string;
      product: {
        title: string;
      };
      inventoryItem: {
        id: ID;
      };
    }>;
  }) => void;
};

function reducer(state: WIPCreateCycleCount, action: Action): WIPCreateCycleCount {
  switch (action.type) {
    case 'SET':
      return action.payload;
    case 'SET_STATUS':
      return { ...state, status: action.payload.status };
    case 'SET_LOCATION':
      return { ...state, locationId: action.payload.locationId };
    case 'SET_DUE_DATE':
      return { ...state, dueDate: action.payload.dueDate };
    case 'SET_NOTE':
      return { ...state, note: action.payload.note };
    case 'SET_ITEMS':
      return { ...state, items: action.payload.items };
    case 'SET_EMPLOYEE_ASSIGNMENTS':
      return { ...state, employeeAssignments: action.payload.employeeAssignments };
    case 'SET_LOCKED':
      return { ...state, locked: action.payload.locked };
    case 'ADD_PRODUCT_VARIANTS':
      return {
        ...state,
        items: [
          ...state.items,
          ...action.payload.productVariants.map(variant => ({
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
      return state;
  }
}

export function useCreateCycleCountReducer(
  initialState: WIPCreateCycleCount,
  hooks: {
    useReducer: typeof useReducer;
    useState: typeof useState;
    useRef: typeof useRef;
  },
): [WIPCreateCycleCount, CreateCycleCountDispatch, boolean, Dispatch<boolean>] {
  const [state, dispatch] = hooks.useReducer(reducer, initialState);
  const [hasUnsavedChanges, setHasUnsavedChanges] = hooks.useState(false);
  const initialStateRef = hooks.useRef(initialState);

  const hasUnsavedChanges = JSON.stringify(state, Object.keys(state).sort()) !==
      JSON.stringify(initialStateRef.current, Object.keys(initialStateRef.current).sort());

  return [
    state,
    {
      set: payload => dispatch({ type: 'SET', payload }),
      setStatus: payload => dispatch({ type: 'SET_STATUS', payload }),
      setLocation: payload => dispatch({ type: 'SET_LOCATION', payload }),
      setDueDate: payload => dispatch({ type: 'SET_DUE_DATE', payload }),
      setNote: payload => dispatch({ type: 'SET_NOTE', payload }),
      setItems: payload => dispatch({ type: 'SET_ITEMS', payload }),
      setEmployeeAssignments: payload => dispatch({ type: 'SET_EMPLOYEE_ASSIGNMENTS', payload }),
      setLocked: payload => dispatch({ type: 'SET_LOCKED', payload }),
      addProductVariants: payload => dispatch({ type: 'ADD_PRODUCT_VARIANTS', payload }),
    },
    hasUnsavedChanges,
    setHasUnsavedChanges,
  ];
}
