import { useQuery } from '@tanstack/react-query';

export type UseQueryData<T extends (...args: any) => ReturnType<typeof useQuery>> = T extends (
  ...args: any
) => ReturnType<typeof useQuery<unknown, unknown, infer Data>>
  ? Data
  : never;
