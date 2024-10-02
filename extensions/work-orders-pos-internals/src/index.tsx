import { DialogProvider } from '@teifi-digital/pos-tools/providers/DialogProvider.js';
import { ScreenSizeProvider } from '@teifi-digital/pos-tools/providers/ScreenSizeProvider.js';
import { AppProvider } from '@teifi-digital/pos-tools/providers/AppProvider.js';
import { ReactNode } from 'react';
import { ReactQueryProvider } from '@work-orders/common-pos/providers/ReactQueryProvider.js';
import { Router } from './routes.js';

export function WorkMateAppShell({ children }: { children: ReactNode }) {
  return (
    <AppProvider appUrl={process.env.APP_URL!}>
      <ReactQueryProvider>{children}</ReactQueryProvider>
    </AppProvider>
  );
}

type Entrypoint = Parameters<typeof Router>[0]['mainRoute'];

export function WorkMateApp({ entrypoint }: { entrypoint: Entrypoint }) {
  return (
    <WorkMateAppShell>
      <DialogProvider>
        <ScreenSizeProvider>
          <Router mainRoute={entrypoint} />
        </ScreenSizeProvider>
      </DialogProvider>
    </WorkMateAppShell>
  );
}

export { Router } from './routes.js';
