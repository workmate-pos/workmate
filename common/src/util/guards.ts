export function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

/**
 * Assertion function that checks whether some key has some value.
 * Handy for filtering lists of discriminated unions, as lambdas do not automatically narrow the type.
 *
 * @example
 * declare const labour: (FixedPriceLabour | HourlyLabour)[];
 * const fixedPriceLabour labour.filter(hasPropertyValue('type', 'fixed-price-labour')) // typeof fuxedPriceLabour = FixedPriceLabour[]
 */
export function hasPropertyValue<const T, const K extends keyof T, const V extends T[K]>(key: K, value: V) {
  return (obj: T): obj is T & { [key in K]: V } => obj[key] === value;
}

export function hasNonNullableProperty<T, K extends keyof T>(key: K) {
  return (obj: T): obj is T & { [key in K]: NonNullable<T[K]> } => isNonNullable(obj[key]);
}
