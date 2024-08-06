import { ID, assertGid, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Int } from '../schemas/generated/pagination-options.js';
import { Money, assertMoney } from '@teifi-digital/shopify-app-toolbox/big-decimal';

export function assertGidOrNull(gid: string | null): asserts gid is ID | null {
  if (gid !== null) {
    assertGid(gid);
  }
}

export function assertInt(value: number): asserts value is Int {
  if (!Number.isInteger(value)) {
    throw new Error(`Expected integer, got ${value}`);
  }
}

export function assertMoneyOrNull(value: string | null): asserts value is Money | null {
  if (value !== null) {
    assertMoney(value);
  }
}

export function isGidWithNamespace(namespace: string) {
  return (id: string | null | undefined): id is ID => {
    return !!id && parseGid(id).objectName === namespace;
  };
}

export const isLineItemId = isGidWithNamespace('LineItem');
