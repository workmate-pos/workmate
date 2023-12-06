import { BrowserRouter } from 'react-router-dom';
import { NavigationMenu } from '@shopify/app-bridge-react';
import Routes from './Routes.jsx';
import { AppBridgeProvider, QueryProvider, PolarisProvider } from '@teifi-digital/shopify-app-react';

export default function App() {
  // Any .tsx files in /pages will become a route
  const pages = import.meta.globEager('./pages/**/!(*.test.[jt]sx)*.([jt]sx)');
  return (
    <PolarisProvider>
      <BrowserRouter>
        <AppBridgeProvider>
          <QueryProvider>
            <NavigationMenu
              navigationLinks={[
                {
                  label: 'Rates',
                  destination: '/rates',
                },
                {
                  label: 'Settings',
                  destination: '/settings',
                },
              ]}
            />
            <Routes pages={pages} />
          </QueryProvider>
        </AppBridgeProvider>
      </BrowserRouter>
    </PolarisProvider>
  );
}
