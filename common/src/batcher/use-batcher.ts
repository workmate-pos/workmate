import { useContext } from 'react';
import { BatchContext, Batches } from './BatchProvider.js';
import { withResolvers } from '@teifi-digital/shopify-app-toolbox/promise';

export type BatcherFetchResult<B extends (...args: any) => any> =
  ReturnType<B> extends {
    fetch: (param: infer P) => Promise<infer R>;
  }
    ? R
    : never;

/**
 * Exposes a `fetch` function that aggregates all calls into a single batched call.
 * Uses a `name` to globally cache batches, similar to react-query.
 * Should be provided a `handler` function that accepts all parameters passed to `fetch`, and returns an array of results.
 * Fetch accepts two parameters, the first of which is part of a batch, and the second of which is shared by the batch.
 * The second parameter is used to group batches together, and is available as a parameter for all items within that batch.
 */
export const useBatcher = <Param, Result, BatchParam = undefined>({
  name,
  handler,
  waitMs = 50,
  maxSize,
}: {
  name: string;
  // TODO: Only optional if batch param is undefined?
  handler: (params: Param[], batchParam?: BatchParam) => Promise<Result[]>;
  waitMs?: number;
  maxSize?: number;
}) => {
  const batches = useContext(BatchContext);
  const batchesByName: Batches[keyof Batches] = (batches[name] ??= new Map());

  const fetch = async (param: Param, batchParam?: any) => {
    if (!batchesByName.has(batchParam)) {
      batchesByName.set(batchParam, { queue: [], timer: undefined });
    }

    const batch = batchesByName.get(batchParam)!;

    if (batch.timer) {
      clearTimeout(batch.timer);
    }

    const { promise, resolve, reject } = withResolvers<Result>();
    batch.queue.push({ param, resolve, reject });

    const flush = async () => {
      const queue = batch.queue;

      batchesByName.delete(batchParam);

      try {
        const params = queue.map(({ param }) => param);
        const results = await handler(params, batchParam);

        if (results.length !== queue.length) {
          const handlerName = { [handler.name]: handler.name, anonymous: 'handler' }[handler.name]!;
          throw new Error(`Incorrect ${handlerName}: expected ${queue.length} results, got ${results.length}`);
        }

        for (let i = 0; i < results.length; i++) {
          queue[i]!.resolve(results[i]!);
        }
      } catch (error) {
        for (const { reject } of queue) {
          reject(error);
        }
      }
    };

    if (maxSize && batch.queue.length >= maxSize) {
      await flush();
    } else {
      batch.timer = setTimeout(flush, waitMs);
    }

    return promise;
  };

  return { fetch };
};
