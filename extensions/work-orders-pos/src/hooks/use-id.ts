import { useMemo } from 'react';
import { uuid } from '../util/uuid';

export const useId = () => {
  return useMemo(uuid, []);
};
