import type { UnionToIntersection } from '@teifi-digital/shopify-app-toolbox/types';

export type Permutations<T, O = T> = [T] extends [never]
  ? readonly []
  : T extends any
    ? readonly [T, ...Permutations<Exclude<O, T>>]
    : never;

/**
 * Makes specific properties required and non-nullable
 */
export type WithNonNullable<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };

export type WithRequired<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };

/**
 * Create a union of input objects where one property is required and the rest are optional.
 */
export type RequireOneProperty<T> = {
  [RequiredKey in keyof T]: {
    [_ in RequiredKey]: T[RequiredKey];
  } & {
    [OptionalKey in Exclude<keyof T, RequiredKey>]?: T[OptionalKey];
  };
}[keyof T];

/**
 * Merge all types in an intersection into a single type.
 * Results in a new intersection where each type is a base type + optionally any property from other types.
 */
export type MergeUnion<T> = Partial<UnionToIntersection<T>> & ([T] extends [infer U] ? U : never);

export type LastElement<T extends unknown[]> = T extends [...infer _, infer L] ? L : never;
