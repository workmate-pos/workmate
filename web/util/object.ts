/**
 * Like Object.entries, but with narrower key types
 */
export function entries<const T extends Record<keyof any, unknown>>(obj: T) {
  return Object.entries(obj) as [keyof T & string, T[keyof T & string]][];
}
