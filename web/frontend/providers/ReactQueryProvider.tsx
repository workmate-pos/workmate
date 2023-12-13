// Shopify currently does not mark peerDependencies as external, leading to two different versions of react-query being
// included in the bundle. To make local and common queries work we need to use providers for both.
import { QueryClient, QueryClientProvider as LocalQueryClientProvider } from 'react-query';
import { QueryClientProvider as CommonQueryClientProvider } from '@common/queries/react-query';
import { ReactNode } from 'react';

const queryClient = new QueryClient();

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  return (
    <LocalQueryClientProvider client={queryClient}>
      <CommonQueryClientProvider client={queryClient}>{children}</CommonQueryClientProvider>
    </LocalQueryClientProvider>
  );
}
