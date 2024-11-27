import { useState } from 'react';
import { reactExtension, useApi } from '@shopify/ui-extensions-react/admin';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReorderPointForm } from '@work-orders/reorder-point-admin';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export const TARGET = 'admin.product-variant-details.block.render';

export default reactExtension(TARGET, () => <App />);

function App() {
  const [queryClient] = useState(() => new QueryClient());
  const api = useApi(TARGET);
  const productVariantId = api.data.selected[0]?.id as ID;

  return (
    <QueryClientProvider client={queryClient}>
      <ReorderPointForm api={api} productVariantId={productVariantId} />
    </QueryClientProvider>
  );
}
