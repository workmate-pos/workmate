import { never } from '@teifi-digital/shopify-app-toolbox/util';

/**
 * Recursively composes the same function n times with different arguments.
 */
export function recompose<A, T>(args: A[], fn: (arg: A, next: () => T) => T, base: () => T): () => T {
  function run(index: number): T {
    if (index >= args.length) {
      return base();
    }

    const arg = args[index] ?? never();
    const next = () => run(index + 1);

    return fn(arg, next);
  }

  return () => run(0);
}
