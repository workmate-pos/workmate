import { useReducer } from 'react';
import { defaultCreatePurchaseOrder } from './default.js';
import { CreatePurchaseOrder, Int, Product } from '@web/schemas/generated/create-purchase-order.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';

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
  | {
      type: 'set';
      purchaseOrder: CreatePurchaseOrder;
    };

type CreatePurchaseOrderProxy = {
  [action in CreatePurchaseOrderAction['type']]: (
    args: DiscriminatedUnionOmit<CreatePurchaseOrderAction, 'type'>,
  ) => void;
};

export const useCreatePurchaseOrderReducer = () => {
  const [createPurchaseOrder, dispatchCreatePurchaseOrder] = useReducer(
    createPurchaseOrderReducer,
    defaultCreatePurchaseOrder,
  );

  const proxy = new Proxy<CreatePurchaseOrderProxy>({} as CreatePurchaseOrderProxy, {
    get: (target, prop) => (args: DiscriminatedUnionOmit<CreatePurchaseOrderAction, 'type'>) => {
      dispatchCreatePurchaseOrder({ type: prop, ...args } as CreatePurchaseOrderAction);
    },
  });

  return [createPurchaseOrder, proxy, dispatchCreatePurchaseOrder] as const;
};

function createPurchaseOrderReducer(createPurchaseOrder: CreatePurchaseOrder, action: CreatePurchaseOrderAction) {
  switch (action.type) {
    case 'setPartial': {
      const { type, ...partial } = action;
      const partialNotUndefined = Object.fromEntries(
        Object.entries(partial).filter(([, value]) => value !== undefined),
      );
      return { ...createPurchaseOrder, ...partialNotUndefined };
    }

    case 'addProducts': {
      return {
        ...createPurchaseOrder,
        products: mergeProducts(...createPurchaseOrder.products, ...action.products).filter(
          product => product.quantity > 0,
        ),
      };
    }

    case 'updateProduct': {
      return {
        ...createPurchaseOrder,
        products: createPurchaseOrder.products
          .map(product => (shouldMergeProducts(product, action.product) ? action.product : product))
          .filter(product => product.quantity > 0),
      };
    }

    case 'set': {
      return action.purchaseOrder;
    }

    default:
      return action satisfies never;
  }
}

function shouldMergeProducts(a: Product, b: Product) {
  return a.productVariantId === b.productVariantId;
}

function mergeProducts(...products: Product[]) {
  const merged: Product[] = [];

  // efficient enough for hundreds of products
  for (const product of products) {
    let found = false;

    for (const existing of merged) {
      if (shouldMergeProducts(product, existing)) {
        existing.quantity = (existing.quantity + product.quantity) as Int;
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
