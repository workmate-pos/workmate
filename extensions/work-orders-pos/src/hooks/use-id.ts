import { useMemo } from 'react';
import { uuid } from '../util/uuid.js';

export const useId = () => {
  return useMemo(uuid, []);
};
