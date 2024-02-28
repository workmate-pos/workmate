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
