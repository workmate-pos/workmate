export function groupBy<const T, const V extends string>(list: T[], keyFn: (item: T) => V) {
  const record: { [k in V]?: T[] } = {};

  for (const item of list) {
    (record[keyFn(item)] ??= []).push(item);
  }

  // removing optional is fine here as long as the generic is not set manually
  return record as { [k in V]: T[] };
}

/**
 * Groups by some key containing string value.
 * Can narrow types more than {@link groupBy}.
 * Especially useful for discriminated unions.
 */
export function groupByKey<const T, const K extends KeysWithStringValues<T>>(list: T[], key: K) {
  return groupBy(list, t => t[key] as string) as { [value in T[K] & string]: (T & { [key in K]: value })[] };
}

type KeysWithStringValues<T> = { [K in keyof T]: T[K] extends string ? K : never }[keyof T];
