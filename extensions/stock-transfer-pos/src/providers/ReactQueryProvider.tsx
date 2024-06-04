import { QueryClientProvider, QueryClient } from '@work-orders/common/queries/react-query.js';
import { ReactNode } from 'react';

const queryClient = new QueryClient();

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
