import { Dispatch, SetStateAction } from 'react';
import { WIPCreateSerial } from './default.js';

export function getCreateSerialSetter<K extends keyof WIPCreateSerial>(
  setCreateSpecialOrder: Dispatch<SetStateAction<WIPCreateSerial>>,
  key: K,
): Dispatch<SetStateAction<WIPCreateSerial[K]>> {
  return arg => {
    if (typeof arg === 'function') {
      setCreateSpecialOrder(current => ({ ...current, [key]: arg(current[key]) }));
    } else {
      setCreateSpecialOrder(current => ({ ...current, [key]: arg }));
    }
  };
}
