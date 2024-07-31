import { ReactQueryProvider } from './providers/ReactQueryProvider.js';
import { DialogProvider } from '@teifi-digital/pos-tools/providers/DialogProvider.js';
import { ScreenSizeProvider } from '@teifi-digital/pos-tools/providers/ScreenSizeProvider.js';
import { AppProvider } from '@teifi-digital/pos-tools/providers/AppProvider.js';
import { ReactNode } from 'react';

export function WorkOrdersApp({ children }: { children: ReactNode }) {
  return (
    <AppProvider appUrl={"https://work-orders-staging.teifi.dev"!}>
      <ReactQueryProvider>
        <DialogProvider>
          <ScreenSizeProvider>{children}</ScreenSizeProvider>
        </DialogProvider>
      </ReactQueryProvider>
    </AppProvider>
  );
}

export { Router } from './routes.js';
