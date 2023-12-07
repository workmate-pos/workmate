/**
 * {@see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers}
 */
export function withResolvers<R>(): {
  promise: Promise<R>;
  resolve: ResolveFn<R>;
  reject: RejectFn<R>;
} {
  let resolve, reject;

  const promise = new Promise<R>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  };
}

export type PromiseCallback<R> = ConstructorParameters<typeof Promise<R>>[0];
export type ResolveFn<R> = Parameters<PromiseCallback<R>>[0];
export type RejectFn<R> = Parameters<PromiseCallback<R>>[1];
