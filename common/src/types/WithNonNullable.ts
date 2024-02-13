/**
 * Makes specific properties required and non-nullable
 */
export type WithNonNullable<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
