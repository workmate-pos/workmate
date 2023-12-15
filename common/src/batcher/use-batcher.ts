import { useContext } from 'react';
import { Batch, BatchContext } from './BatchProvider.js';
import { withResolvers } from '../util/promise.js';

export type BatcherFetchResult<B extends (...args: any) => any> = ReturnType<B> extends {
  fetch: (param: infer P) => Promise<infer R>;
}
  ? R
  : never;

/**
 * Exposes a `fetch` function that aggregates all calls into a single batched call.
 * Uses a `name` to globally cache batches, similar to react-query.
 * Should be provided a `handler` function that accepts all parameters passed to `fetch`, and returns an array of results.
 * @todo: give the entire queue to the handler so individual results can be rejected too
 */
export const useBatcher = <Param, Result>({
  name,
  handler,
  waitMs = 50,
  maxSize,
}: {
  name: string;
  handler: (params: Param[]) => Promise<Result[]>;
  waitMs?: number;
  maxSize?: number;
}) => {
  const batches = useContext(BatchContext);
  const batch: Batch<Param, Result> = (batches[name] ??= { queue: [] });

  const fetch = async (param: Param) => {
    if (batch.timer) {
      clearTimeout(batch.timer);
    }

    const { promise, resolve, reject } = withResolvers<Result>();
    batch.queue.push({ param, resolve, reject });

    const flush = async () => {
      const queue = batch.queue;

      batch.timer = undefined;
      batch.queue = [];

      try {
        const params = queue.map(({ param }) => param);
        const results = await handler(params);

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
