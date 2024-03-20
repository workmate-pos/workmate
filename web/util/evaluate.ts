/**
 * just an iife
 */
export function evaluate<T>(fn: () => T): T {
  return fn();
}
