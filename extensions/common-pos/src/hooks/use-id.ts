import { useMemo } from 'react';

export const useId = () => {
  return useMemo(() => uuid(), []);
};

function uuid() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
