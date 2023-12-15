import { never } from './never.js';

export type PromiseState = 'pending' | 'resolved' | 'rejected';

/**
 * {@see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers}
 */
export function withResolvers<R>(): {
  promise: Promise<R>;
  resolve: ResolveFn<R>;
  reject: RejectFn<R>;
  getState(): PromiseState;
} {
  let resolve, reject;

  let state: PromiseState = 'pending';

  const promise = new Promise<R>((res, rej) => {
    resolve = (...args: Parameters<typeof res>) => {
      state = 'resolved';
      res(...args);
    };
    reject = (...args: Parameters<typeof rej>) => {
      state = 'rejected';
      rej(...args);
    };
  });

  return {
    promise,
    resolve: resolve ?? never(NEVER_NOTE),
    reject: reject ?? never(NEVER_NOTE),
    getState: () => state,
  };
}

const NEVER_NOTE = 'Promise constructor callbacks are run synchronously, so this should be impossible';

export type PromiseCallback<R> = ConstructorParameters<typeof Promise<R>>[0];
export type ResolveFn<R> = Parameters<PromiseCallback<R>>[0];
export type RejectFn<R> = Parameters<PromiseCallback<R>>[1];
