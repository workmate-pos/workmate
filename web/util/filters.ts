/*
 * Handy filters that can be used directly inside {@link Array.prototype.filter}
 * Every function in here can either be used directly, or is used to construct a predicate function.
 * The latter is useful when you want to narrow the type of elements (this is not possible with an anonymous lambda without manually specifying the return type)
 */

export function isNotNull<T>(obj: T): obj is NonNullable<T> {
  return obj !== null;
}

export function hasPropertyValue<const T, const K extends keyof T, const V extends T[K]>(key: K, value: V) {
  return (obj: T): obj is T & { [key in K]: V } => obj[key] === value;
}
