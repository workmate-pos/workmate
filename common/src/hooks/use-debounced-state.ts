import type { SetStateAction, useRef, useState } from 'react';

type CreateUseDebouncedStateHooks = {
  useRef: typeof useRef;
  useState: typeof useState;
};

export function createUseDebouncedState({ useRef, useState }: CreateUseDebouncedStateHooks) {
  return function <T>(initialValue: T, debounceMs: number = 250) {
    const timerRef = useRef<NodeJS.Timeout>();

    const [optimisticState, setOptimisticState] = useState(initialValue);
    const [currentState, setCurrentState] = useState(initialValue);

    const setState = (value: SetStateAction<T>, immediately: boolean = false) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }

      setOptimisticState(value);

      if (immediately) {
        setCurrentState(value);
        return;
      }

      timerRef.current = setTimeout(() => {
        setCurrentState(value);
        timerRef.current = undefined;
      }, debounceMs);
    };

    return [currentState, setState, optimisticState] as const;
  };
}
