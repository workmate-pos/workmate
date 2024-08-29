import { NonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';
import { MINUTE_IN_MS } from '@work-orders/common/time/constants.js';

export type Nest<T extends object> = { [K in keyof T]: T[K][] };

/**
 * The opposite of postgres' UNNEST.
 * Takes an array of objects and returns an object of arrays.
 */
export function nest<T extends object>(items: NonEmptyArray<T>): Nest<T> {
  const [item] = items;
  const keys = Object.keys(item) as (keyof T)[];
  return Object.fromEntries(keys.map(key => [key, items.map(item => item[key])])) as Nest<T>;
}

export function isStale(item: { updatedAt: Date }, maxAgeMs: number = 30 * MINUTE_IN_MS) {
  return Date.now() - item.updatedAt.getTime() > maxAgeMs;
}

export function createIsStaleFn(maxAgeMs?: number) {
  return (item: { updatedAt: Date }) => isStale(item, maxAgeMs);
}
