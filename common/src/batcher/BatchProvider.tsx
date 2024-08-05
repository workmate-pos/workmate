import { ReactNode, createContext } from 'react';
import { RejectFn, ResolveFn } from '@teifi-digital/shopify-app-toolbox/promise';

export const BatchContext = createContext<Batches>({});

/**
 * Provider that can be used if you want to manage batch contexts yourself.
 * Don't know why you would want to do that, but OK 🤷
 */
export function BatchProvider({ children }: { children: ReactNode }) {
  const batches: Batches = {};

  // @ts-ignore shut up
  return <BatchContext.Provider value={batches}>{children}</BatchContext.Provider>;
}

export type Batches = {
  [name: string]: Batch<any, any>;
};

export type Batch<Param, Result> = {
  queue: { param: Param; resolve: ResolveFn<Result>; reject: RejectFn<Result> }[];
  timer?: NodeJS.Timeout;
};
