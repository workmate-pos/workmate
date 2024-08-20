import { NonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';

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
