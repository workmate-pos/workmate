import { CreateSpecialOrder } from '@web/schemas/generated/create-special-order.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Dispatch, SetStateAction } from 'react';

export type WIPCreateSpecialOrder = Omit<CreateSpecialOrder, 'customerId' | 'locationId'> & {
  customerId: CreateSpecialOrder['customerId'] | null;
  locationId: CreateSpecialOrder['locationId'] | null;
};

export const defaultCreateSpecialOrder: WIPCreateSpecialOrder = {
  requiredBy: null,
  companyContactId: null,
  companyLocationId: null,
  customerId: null,
  companyId: null,
  name: null,
  locationId: null,
  note: '',
  lineItems: [],
};

export function getCreateSpecialOrderSetter<K extends keyof WIPCreateSpecialOrder>(
  setCreateSpecialOrder: Dispatch<SetStateAction<WIPCreateSpecialOrder>>,
  key: K,
): Dispatch<SetStateAction<WIPCreateSpecialOrder[K]>> {
  return arg => {
    if (typeof arg === 'function') {
      setCreateSpecialOrder(current => ({ ...current, [key]: arg(current[key]) }));
    } else {
      setCreateSpecialOrder(current => ({ ...current, [key]: arg }));
    }
  };
}
