import type { useReducer, useRef, useState } from 'react';
import { CreatePurchaseOrder, Int, Product } from '@web/schemas/generated/create-purchase-order.js';
import { DiscriminatedUnionOmit } from '../types/DiscriminatedUnionOmit.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';

export type CreatePurchaseOrderAction =
  | ({
      type: 'setPartial';
    } & Partial<CreatePurchaseOrder>)
  | {
      type: 'addProducts';
      products: Product[];
    }
  | {
      type: 'updateProduct';
      product: Product;
    }
  | ({
      type: 'set';
    } & CreatePurchaseOrder)
  | {
      type: 'setInventoryState';
      inventoryState: 'available' | 'unavailable';
    }
  | ({
      type: 'setVendor';
    } & Pick<CreatePurchaseOrder, 'vendorName'>)
  | ({
      type: 'setLocation';
    } & Pick<CreatePurchaseOrder, 'locationId'>);

export type CreatePurchaseOrderDispatchProxy = {
  [type in CreatePurchaseOrderAction['type']]: (args: Omit<CreatePurchaseOrderAction & { type: type }, 'type'>) => void;
};

export type UseCreatePurchaseOrderReactContext = {
  useRef: typeof useRef;
  useState: typeof useState;
  useReducer: typeof useReducer;
};

export const useCreatePurchaseOrderReducer = (
  initialCreatePurchaseOrder: CreatePurchaseOrder,
  { useState, useRef, useReducer }: UseCreatePurchaseOrderReactContext,
) => {
  const [createPurchaseOrder, dispatchCreatePurchaseOrder] = useReducer(
    createPurchaseOrderReducer,
    initialCreatePurchaseOrder,
  );

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const proxy = useRef(
    new Proxy<CreatePurchaseOrderDispatchProxy>({} as CreatePurchaseOrderDispatchProxy, {
      get: (target, prop) => (args: DiscriminatedUnionOmit<CreatePurchaseOrderAction, 'type'>) => {
        setHasUnsavedChanges(true);
        dispatchCreatePurchaseOrder({ type: prop, ...args } as CreatePurchaseOrderAction);
      },
    }),
  ).current;

  return [createPurchaseOrder, proxy, hasUnsavedChanges, setHasUnsavedChanges] as const;
};

function createPurchaseOrderReducer(
  createPurchaseOrder: CreatePurchaseOrder,
  action: CreatePurchaseOrderAction,
): CreatePurchaseOrder {
  switch (action.type) {
    case 'setPartial':
    case 'setVendor':
    case 'setLocation':
    case 'set': {
      const { type, ...partial } = action;
      const partialNotUndefined: Partial<CreatePurchaseOrder> = Object.fromEntries(
        Object.entries(partial).filter(([, value]) => value !== undefined),
      );

      if (action.type === 'setVendor') {
        partialNotUndefined.lineItems = [];
      }

      return { ...createPurchaseOrder, ...partialNotUndefined };
    }

    case 'addProducts': {
      return {
        ...createPurchaseOrder,
        lineItems: mergeProducts(...createPurchaseOrder.lineItems, ...action.products).filter(
          product => product.quantity > 0,
        ),
      };
    }

    case 'updateProduct': {
      return {
        ...createPurchaseOrder,
        lineItems: createPurchaseOrder.lineItems
          .map(product => (shouldMergeProducts(product, action.product) ? action.product : product))
          .filter(product => product.quantity > 0),
      };
    }

    case 'setInventoryState': {
      const lineItems = createPurchaseOrder.lineItems.map(product => ({
        ...product,
        // for now we only support having the full quantity available or none
        availableQuantity: action.inventoryState === 'available' ? product.quantity : (0 as Int),
      }));

      return { ...createPurchaseOrder, lineItems };
    }

    default:
      return action satisfies never;
  }
}

function shouldMergeProducts(a: Product, b: Product) {
  return a.productVariantId === b.productVariantId && a.shopifyOrderLineItem?.id === b.shopifyOrderLineItem?.id;
}

function mergeProducts(...products: Product[]) {
  const merged: Product[] = [];

  // efficient enough for hundreds of products
  for (const product of products) {
    let found = false;

    for (const existing of merged) {
      if (shouldMergeProducts(product, existing)) {
        const productQuantityBigDecimal = BigDecimal.fromString(product.quantity.toFixed(0));
        const existingQuantityBigDecimal = BigDecimal.fromString(existing.quantity.toFixed(0));

        const unitCost = BigDecimal.sum(
          BigDecimal.fromMoney(product.unitCost).multiply(productQuantityBigDecimal),
          BigDecimal.fromMoney(existing.unitCost).multiply(existingQuantityBigDecimal),
        )
          .divide(productQuantityBigDecimal.add(existingQuantityBigDecimal))
          .round(2)
          .toMoney();

        existing.quantity = (existing.quantity + product.quantity) as Int;
        existing.availableQuantity = (existing.availableQuantity + product.availableQuantity) as Int;
        existing.unitCost = unitCost;
        found = true;
        break;
      }
    }

    if (!found) {
      merged.push(product);
    }
  }

  return merged;
}
