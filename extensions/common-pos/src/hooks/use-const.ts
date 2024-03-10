import { useRef } from 'react';

export function useConst<T>(factory: () => T): T {
  const ref = useRef<T>();

  if (ref.current === undefined) {
    ref.current = factory();
  }

  return ref.current;
}
