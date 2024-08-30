import { ID, assertGid, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Int } from '../schemas/generated/pagination-options.js';
import { Money, assertMoney } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { UUID } from './types.js';
import { validate, version } from 'uuid';
import { isGidWithNamespace } from '@work-orders/common/util/gid.js';

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

export function assertUuid(value: string): asserts value is UUID {
  if (!validate(value) || version(value) !== 4) {
    throw new Error(`Invalid uuid ${value}`);
  }
}

export function assertMoneyOrNull(value: string | null): asserts value is Money | null {
  if (value !== null) {
    assertMoney(value);
  }
}

export const isLineItemId = isGidWithNamespace('LineItem');
