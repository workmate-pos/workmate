import { Batch, BatchContext } from '../providers/BatchProvider';
import { useContext } from 'react';
import { withResolvers } from '../util/promise';

/**
 * Exposes a `fetch` function that aggregates all calls into a single batched call.
 * Uses a `name` to globally cache batches, similar to react-query.
 */
export const useBatcher = <Param, Result>({
  name,
  handler,
  waitMs,
}: {
  name: string;
  handler: (params: Param[]) => Promise<Result[]>;
  waitMs?: number;
}) => {
  const batches = useContext(BatchContext);
  const batch: Batch<Param, Result> = (batches[name] ??= { queue: [] });

  const fetch = async (param: Param) => {
    if (batch.timer) {
      window.clearTimeout(batch.timer);
    }

    const { promise, resolve, reject } = withResolvers<Result>();
    batch.queue.push({ param, resolve, reject });

    batch.timer = window.setTimeout(async () => {
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
    }, waitMs);

    return promise;
  };

  return { fetch };
};
