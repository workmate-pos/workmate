/**
 * Like Object.entries, but with proper key types
 */
export function entries<const T extends Record<keyof any, unknown>>(obj: T) {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}
