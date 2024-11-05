import { useState } from 'react';
import { reactExtension } from '@shopify/ui-extensions-react/admin';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReorderPointForm } from './components/ReorderPointForm.js';

export const TARGET = 'admin.product-variant-details.block.render';

export default reactExtension(TARGET, () => <App />);

function App() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <ReorderPointForm />
    </QueryClientProvider>
  );
}
