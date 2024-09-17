import { DialogProvider } from '@teifi-digital/pos-tools/providers/DialogProvider.js';
import { ScreenSizeProvider } from '@teifi-digital/pos-tools/providers/ScreenSizeProvider.js';
import { AppProvider } from '@teifi-digital/pos-tools/providers/AppProvider.js';
import { ReactNode } from 'react';
import { ReactQueryProvider } from '@work-orders/common-pos/providers/ReactQueryProvider.js';

export function WorkOrdersApp({ children }: { children: ReactNode }) {
  return (
    <AppProvider appUrl={process.env.APP_URL!}>
      <ReactQueryProvider>
        <DialogProvider>
          <ScreenSizeProvider>{children}</ScreenSizeProvider>
        </DialogProvider>
      </ReactQueryProvider>
    </AppProvider>
  );
}

export { Router } from './routes.js';
