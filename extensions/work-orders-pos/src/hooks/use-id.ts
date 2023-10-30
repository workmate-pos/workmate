import { useMemo } from 'react';

export const useId = () => {
  return useMemo(generateId, []);
};

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}
