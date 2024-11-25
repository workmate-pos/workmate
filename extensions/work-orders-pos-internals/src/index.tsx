import { DialogProvider } from '@teifi-digital/pos-tools/providers/DialogProvider.js';
import { ScreenSizeProvider } from '@teifi-digital/pos-tools/providers/ScreenSizeProvider.js';
import { AppProvider } from '@teifi-digital/pos-tools/providers/AppProvider.js';
import { FC, ReactNode, useState } from 'react';
import { ReactQueryProvider } from '@work-orders/common-pos/providers/ReactQueryProvider.js';
import { RouterProvider, Modals, getComponent } from './routes.js';
import { PosRoot } from '@teifi-digital/universal-ui/pos/PosRoot.js';
import { Text, useApi } from '@shopify/ui-extensions-react/point-of-sale';
import React from 'react';

export function WorkMateAppShell({ children }: { children: ReactNode }) {
  return (
    <AppProvider appUrl={process.env.APP_URL!}>
      <ReactQueryProvider>{children}</ReactQueryProvider>
    </AppProvider>
  );
}

type Route = Parameters<typeof getComponent>[0];

// entrypoint must not have any required properties
type Entrypoint = {
  [K in Route]: ReturnType<typeof getComponent<K>>['Component'] extends FC<infer P>
    ? Partial<P> extends P
      ? K
      : never
    : never;
}[Route];

export function WorkMateApp({ entrypoint }: { entrypoint: Entrypoint }) {
  const [{ title, Component }] = useState(() => getComponent(entrypoint));

  const { toast } = useApi<'pos.home.modal.render'>();

  return (
    <ErrorBoundary log={message => toast.show(message)}>
      <WorkMateAppShell>
        <DialogProvider>
          <ScreenSizeProvider>
            <RouterProvider>
              <ErrorBoundary log={message => toast.show(message)}>
                <PosRoot title={title} useApi={useApi}>
                  <ErrorBoundary log={message => toast.show(message)}>
                    <Component />
                    <Modals />
                  </ErrorBoundary>
                </PosRoot>
              </ErrorBoundary>
            </RouterProvider>
          </ScreenSizeProvider>
        </DialogProvider>
      </WorkMateAppShell>
    </ErrorBoundary>
  );
}

class ErrorBoundary extends React.Component<
  { children: ReactNode; log: (message: string) => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error(error, errorInfo);
    this.props.log(String(error));
  }

  render() {
    if (this.state.hasError) {
      return <Text>Something went wrong</Text>;
    }

    return this.props.children;
  }
}
