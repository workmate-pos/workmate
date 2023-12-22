export * from 'react-query';

import type { useQuery } from 'react-query';

export type UseQueryData<T extends (...args: any) => ReturnType<typeof useQuery>> = T extends (
  ...args: any
) => ReturnType<typeof useQuery<unknown, unknown, infer Data>>
  ? Data
  : never;
