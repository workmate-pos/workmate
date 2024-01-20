export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export function sum<T>(arr: T[], fn: (item: T) => number): number {
  return arr.reduce((sum, item) => sum + fn(item), 0);
}
