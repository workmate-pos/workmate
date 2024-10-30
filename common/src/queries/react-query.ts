import { useQuery } from '@tanstack/react-query';

// IMPORTANT NOTE: This does not work if you use `select`
export type UseQueryData<T extends (...args: any) => ReturnType<typeof useQuery>> = T extends (
  ...args: any
) => ReturnType<typeof useQuery<unknown, unknown, infer Data>>
  ? Data
  : never;
