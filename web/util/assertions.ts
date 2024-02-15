import { ID, assertGid } from '@teifi-digital/shopify-app-toolbox/shopify';
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
