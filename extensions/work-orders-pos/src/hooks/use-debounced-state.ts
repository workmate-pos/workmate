import { SetStateAction, useEffect, useState } from 'react';

export const useDebouncedState = <T>(initialValue: T, debounceMs: number = 250) => {
  const [internalState, setInternalState] = useState(initialValue);
  const [externalState, setExternalState] = useState(initialValue);

  useEffect(() => {
    if (externalState === internalState) return;

    const originalInternalState = internalState;
    const timeout = setTimeout(() => {
      setInternalState(internalState => {
        // the internal state may have changed if setImmediately was called. do not update if this is the case
        if (internalState !== originalInternalState) return internalState;
        return externalState;
      });
    }, debounceMs);

    return () => {
      clearTimeout(timeout);
    };
  }, [externalState]);

  const setState = (value: SetStateAction<T>, immediately: boolean = false) => {
    setExternalState(value);
    if (immediately) {
      setInternalState(value);
    }
  };

  return [internalState, setState] as const;
};
