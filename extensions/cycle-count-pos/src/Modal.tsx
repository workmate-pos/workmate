import { reactExtension, useApi } from '@shopify/ui-extensions-react/point-of-sale';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from './routes.js';
import { useState } from 'react';
import { AppProvider } from '@teifi-digital/pos-tools/providers/AppProvider.js';
import { ScreenSizeProvider } from '@teifi-digital/pos-tools/providers/ScreenSizeProvider.js';
import { DialogProvider } from '@teifi-digital/pos-tools/providers/DialogProvider.js';

export default reactExtension('pos.home.modal.render', () => <Modal />);

function Modal() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <AppProvider appUrl={process.env.APP_URL!}>
      <QueryClientProvider client={queryClient}>
        <ScreenSizeProvider>
          <DialogProvider>
            <Router mainRoute={'Entry'} />
          </DialogProvider>
        </ScreenSizeProvider>
      </QueryClientProvider>
    </AppProvider>
  );
}
