import type { useReducer, useRef, useState } from 'react';
import { CreatePurchaseOrder, Int, Product } from '@web/schemas/generated/create-purchase-order.js';
import { DiscriminatedUnionOmit } from '../types/DiscriminatedUnionOmit.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { uuid } from '@work-orders/common/util/uuid.js';

export type CreatePurchaseOrderAction =
  | ({
      action: 'setPartial';
    } & Partial<CreatePurchaseOrder>)
  | {
      action: 'addProducts';
      products: Product[];
    }
  | {
      action: 'updateProduct';
      product: Product;
    }
  | ({
      action: 'set';
    } & CreatePurchaseOrder)
  | ({
      action: 'setVendor';
    } & Pick<CreatePurchaseOrder, 'vendorName'>)
  | ({
      action: 'setLocation';
    } & Pick<CreatePurchaseOrder, 'locationId'>);

export type CreatePurchaseOrderDispatchProxy = {
  [action in CreatePurchaseOrderAction['action']]: (
    args: Omit<CreatePurchaseOrderAction & { action: action }, 'action'>,
  ) => void;
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
      get: (target, prop) => (args: DiscriminatedUnionOmit<CreatePurchaseOrderAction, 'action'>) => {
        setHasUnsavedChanges(true);
        dispatchCreatePurchaseOrder({ action: prop, ...args } as CreatePurchaseOrderAction);
      },
    }),
  ).current;

  return [createPurchaseOrder, proxy, hasUnsavedChanges, setHasUnsavedChanges] as const;
};

function createPurchaseOrderReducer(
  createPurchaseOrder: CreatePurchaseOrder,
  _action: CreatePurchaseOrderAction,
): CreatePurchaseOrder {
  switch (_action.action) {
    case 'setPartial':
    case 'setVendor':
    case 'setLocation':
    case 'set': {
      const { action, ...partial } = _action;
      const partialNotUndefined: Partial<CreatePurchaseOrder> = Object.fromEntries(
        Object.entries(partial).filter(([, value]) => value !== undefined),
      );

      if (_action.action === 'setVendor') {
        partialNotUndefined.lineItems = [];
      }

      return { ...createPurchaseOrder, ...partialNotUndefined };
    }

    case 'addProducts': {
      return {
        ...createPurchaseOrder,
        lineItems: fixLineItems([...createPurchaseOrder.lineItems, ..._action.products]),
      };
    }

    case 'updateProduct': {
      return {
        ...createPurchaseOrder,
        lineItems: fixLineItems(
          createPurchaseOrder.lineItems.map(product =>
            product.uuid === _action.product.uuid ? _action.product : product,
          ),
        ),
      };
    }

    default:
      return _action satisfies never;
  }
}

/**
 * Whether a and b should be merged into a. Merges into a (i.e. keeps the uuid of a)
 */
function shouldMergeProducts(a: Product, b: Product) {
  // we only merge into a if a and b both have not been received yet. if a has received the unit price is locked, which we don't want after merging
  return (
    a.productVariantId === b.productVariantId &&
    a.specialOrderLineItem?.name === b.specialOrderLineItem?.name &&
    a.specialOrderLineItem?.uuid === b.specialOrderLineItem?.uuid &&
    a.serialNumber === null &&
    b.serialNumber === null
  );
}

function mergeProducts(products: Product[]) {
  const merged: Product[] = [];

  // efficient enough for hundreds of products
  for (const product of products) {
    let found = false;

    for (const existing of merged) {
      if (shouldMergeProducts(existing, product)) {
        const productQuantityBigDecimal = BigDecimal.fromString(product.quantity.toFixed(0));
        const existingQuantityBigDecimal = BigDecimal.fromString(existing.quantity.toFixed(0));

        const unitCost = BigDecimal.sum(
          BigDecimal.fromMoney(product.unitCost).multiply(productQuantityBigDecimal),
          BigDecimal.fromMoney(existing.unitCost).multiply(existingQuantityBigDecimal),
        )
          .divide(productQuantityBigDecimal.add(existingQuantityBigDecimal))
          .toMoney();

        existing.quantity = (existing.quantity + product.quantity) as Int;
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

// we should ensure that adding a serial number
// splits a product into two products:
// - one with a serial number and quantity 1
// - one with the remaining quantity
function splitSerials(products: Product[]) {
  return products.flatMap<Product>(product => {
    if (product.serialNumber === null) {
      return product;
    }

    return [
      {
        ...product,
        quantity: 1,
      },
      {
        ...product,
        uuid: uuid(),
        serialNumber: null,
        quantity: product.quantity - 1,
      },
    ];
  });
}

function fixLineItems(products: Product[]) {
  return mergeProducts(splitSerials(products)).filter(product => product.quantity > 0);
}
