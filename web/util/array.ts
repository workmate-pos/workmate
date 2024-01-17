export function groupBy<T>(list: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const record: Record<string, T[]> = {};

  for (const item of list) {
    (record[keyFn(item)] ??= []).push(item);
  }

  return record;
}
