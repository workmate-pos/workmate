import { ReactNode, createContext } from 'react';
import { RejectFn, ResolveFn } from '../util/promise';

export const BatchContext = createContext<Batches>({});

export function BatchProvider({ children }: { children: ReactNode }) {
  const batches: Batches = {};

  return <BatchContext.Provider value={batches}>{children}</BatchContext.Provider>;
}

export type Batches = {
  [name: string]: Batch<any, any>;
};

export type Batch<Param, Result> = {
  queue: { param: Param; resolve: ResolveFn<Result>; reject: RejectFn<Result> }[];
  timer?: number;
};
