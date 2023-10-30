import { DependencyList, useEffect, useRef } from 'react';

export const useDynamicRef = <T>(factory: () => T, deps: DependencyList) => {
  const ref = useRef(factory());

  useEffect(() => {
    ref.current = factory();
  }, deps);

  return ref;
};
