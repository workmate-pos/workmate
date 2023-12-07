// TODO: move
type Succ<D extends number> = [1, 2, 3, 4, ...never[]][D];

export type AwaitNested<T, Depth extends number = 0> = Depth extends never
  ? 'Error: object is too deep. Add more numbers to Succ<D> to fix'
  : T extends string | number | boolean | null | undefined
    ? T
    : T extends Promise<infer U>
      ? AwaitNested<U>
      : T extends (infer U)[]
        ? AwaitNested<U, Succ<Depth>>[]
        : T extends object
          ? { [K in keyof T]: AwaitNested<T[K], Succ<Depth>> }
          : 'Error: unexpected type. Something may be missing in AwaitNested<T>';

/**
 * Like {@see Promise.all}, but supports nesting and objects
 */
export async function awaitNested<T>(value: T): Promise<AwaitNested<T>> {
  if (value instanceof Promise) {
    return (await awaitNested(await value)) as any;
  }

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return (await Promise.all(value.map(element => awaitNested(element)))) as any;
    }

    if (value === null) {
      return value as any;
    }

    return Object.fromEntries(
      await Promise.all(Object.entries(value).map(async ([key, value]) => [key, await awaitNested(value)])),
    ) as any;
  }

  return value as any;
}
