import { withResolvers } from '@teifi-digital/shopify-app-toolbox/promise';
import { zip } from '@teifi-digital/shopify-app-toolbox/iteration';
import { Primitive } from '@teifi-digital/shopify-app-toolbox/types';

export type BatchedFunctionOptions<T, R> = {
  /**
   * The maximum number of items to batch together.
   * Defaults to Infinity.
   */
  maxBatchSize?: number;
  /**
   * The maximum amount of time to wait before flushing an item.
   * Defaults to 10ms.
   */
  maxBatchTimeMs?: number;
  /**
   * Batch processing function.
   * Must return an array of the same length as the input array, will throw otherwise.
   * If this function throws, all items will be rejected with the same error.
   */
  process: (items: T[]) => Promise<R[]>;
};

export const defaultOptions = {
  maxBatchSize: Number.POSITIVE_INFINITY,
  maxBatchTimeMs: 10,
} as const;

/**
 * Create a batched function based on some batch execution strategy.
 */
export function createBatchedFunction<T, R>(options: BatchedFunctionOptions<T, R>) {
  const { maxBatchSize, maxBatchTimeMs, process } = {
    ...defaultOptions,
    ...options,
  } satisfies BatchedFunctionOptions<T, R>;

  const queue: { item: T; resolver: ReturnType<typeof withResolvers<R>> }[] = [];
  let timestamp: number | null = null;

  const flush = () => {
    const batch = queue.splice(0);
    timestamp = null;

    const items = batch.map(({ item }) => item);
    const resolvers = batch.map(({ resolver }) => resolver);

    process(items)
      .then(results => {
        if (results.length !== resolvers.length) {
          throw new Error(`Unexpected number of results: expected ${resolvers.length}, got ${results.length}`);
        }

        for (const [result, { resolve }] of zip(results, resolvers)) {
          resolve(result);
        }
      })
      .catch(error => {
        for (const { reject } of resolvers) {
          reject(error);
        }
      });
  };

  const flushIfNeeded = () => {
    const exceedsMaxBatchSize = queue.length >= maxBatchSize;
    const exceedsMaxBatchTime = timestamp && Date.now() - timestamp >= maxBatchTimeMs;

    const shouldFlush = exceedsMaxBatchSize || exceedsMaxBatchTime;

    if (shouldFlush) {
      flush();
    }
  };

  return async (item: T): Promise<R> => {
    const resolver = withResolvers<R>();

    if (queue.length === 0) {
      timestamp = Date.now();
      new Promise(resolve => setTimeout(resolve, maxBatchTimeMs)).then(flushIfNeeded);
    }

    queue.push({ item, resolver });
    flushIfNeeded();

    return resolver.promise;
  };
}

export type PartitionedBatchedFunctionOptions<T, R> = {
  key: Primitive;
  argument: T;
} & BatchedFunctionOptions<T, R>;

/**
 * Create a batched function that dynamically partitions batches based on a key.
 */
export function createPartitionedBatchedFunction<A extends readonly unknown[], T, R>(
  getOptions: (...args: A) => PartitionedBatchedFunctionOptions<T, R>,
) {
  const partitionFunctions = new Map<Primitive, (item: T) => Promise<R>>();

  return (...args: A): Promise<R> => {
    const { key, argument, ...options } = getOptions(...args);

    let fn = partitionFunctions.get(key);

    if (!fn) {
      const { process, ...batchedFunctionOptions } = options;

      fn = createBatchedFunction({
        ...batchedFunctionOptions,
        process: (items: T[]) => {
          partitionFunctions.delete(key);
          return process(items);
        },
      });

      partitionFunctions.set(key, fn);
    }

    return fn(argument);
  };
}
