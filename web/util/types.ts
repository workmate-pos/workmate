export type Permutations<T, O = T> = [T] extends [never]
  ? readonly []
  : T extends any
    ? readonly [T, ...Permutations<Exclude<O, T>>]
    : never;
