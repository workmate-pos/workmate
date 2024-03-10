import { CreateProduct } from '@web/schemas/generated/create-product.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { useReducer, useState } from 'react';
import { CreateProductBase, defaultCreateProduct } from './default.js';
import { useConst } from '@work-orders/common-pos/hooks/use-const.js';

export type CreateProductAction =
  | ({
      type: 'setPartial';
    } & Partial<CreateProduct>)
  | ({
      type: 'set';
    } & CreateProduct);

export type CreateProductDispatchProxy = {
  [type in CreateProductAction['type']]: (
    args: DiscriminatedUnionOmit<CreateProductAction & { type: type }, 'type'>,
  ) => void;
};

export const useCreateProductReducer = (base: CreateProductBase) => {
  const [createPurchaseOrder, dispatchCreateProduct] = useReducer(createProductReducer, defaultCreateProduct(base));

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const proxy = useConst(
    () =>
      new Proxy<CreateProductDispatchProxy>({} as CreateProductDispatchProxy, {
        get: (target, prop) => (args: DiscriminatedUnionOmit<CreateProductAction, 'type'>) => {
          setHasUnsavedChanges(true);
          dispatchCreateProduct({ type: prop, ...args } as CreateProductAction);
        },
      }),
  );

  return [createPurchaseOrder, proxy, hasUnsavedChanges, setHasUnsavedChanges] as const;
};

function createProductReducer(createPurchaseOrder: CreateProduct, action: CreateProductAction) {
  switch (action.type) {
    case 'setPartial':
    case 'set': {
      const { type, ...partial } = action;
      const partialNotUndefined = Object.fromEntries(
        Object.entries(partial).filter(([, value]) => value !== undefined),
      );
      return { ...createPurchaseOrder, ...partialNotUndefined };
    }

    default:
      return action satisfies never;
  }
}
