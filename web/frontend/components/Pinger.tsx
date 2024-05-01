import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { ReactNode, useEffect } from 'react';

export function Pinger({ children }: { children: ReactNode }) {
  const fetch = useAuthenticatedFetch({
    setToastAction: () => {},
    reauthOptions: { redirect: true, newContext: false },
  });

  useEffect(() => {
    fetch('/api/ping');
  }, []);

  return children;
}
