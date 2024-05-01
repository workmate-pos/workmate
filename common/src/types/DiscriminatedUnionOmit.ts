/**
 * Omit<> does not work on discriminated unions (it merges them all), so we need to add a conditional around it to split the union
 */
export type DiscriminatedUnionOmit<T, K extends UnionKeys<T>> = T extends unknown ? Omit<T, K> : never;

type UnionKeys<T> = T extends T ? keyof T : never;
