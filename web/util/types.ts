import type { Primitive, UnionToIntersection } from '@teifi-digital/shopify-app-toolbox/types';
import { DateTime } from '../services/gql/queries/generated/schema.js';

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

export type NestedDateToDateTime<T> = T extends Primitive
  ? T
  : T extends Date
    ? DateTime
    : T extends (infer U)[]
      ? NestedDateToDateTime<U>[]
      : T extends {}
        ? { [P in keyof T]: NestedDateToDateTime<T[P]> }
        : T;
