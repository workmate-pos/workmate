import { BrowserRouter } from 'react-router-dom';
import { NavigationMenu } from '@shopify/app-bridge-react';
import Routes from './Routes.jsx';
import { AppBridgeProvider, PolarisProvider } from '@teifi-digital/shopify-app-react';
import { ReactQueryProvider } from './providers/ReactQueryProvider.jsx';
import { Pinger } from './components/Pinger.js';
import { IntercomProvider } from 'react-use-intercom';
import { Intercom } from '@web/frontend/components/Intercom.js';

export default function App() {
  // Any .tsx files in /pages will become a route
  const pages = import.meta.globEager('./pages/**/!(*.test.[jt]sx)*.([jt]sx)');

  return (
    <PolarisProvider>
      <BrowserRouter>
        <AppBridgeProvider>
          <ReactQueryProvider>
            <Pinger>
              <NavigationMenu
                navigationLinks={[
                  {
                    label: 'Work Orders',
                    destination: '/work-orders',
                  },
                  {
                    label: 'Purchase Orders',
                    destination: '/purchase-orders',
                  },
                  {
                    label: 'Special Orders',
                    destination: '/special-orders',
                  },
                  {
                    label: 'Serials',
                    destination: '/serials',
                  },
                  {
                    label: 'Services & Labour',
                    destination: '/services-and-labour',
                  },
                  {
                    label: 'Notifications',
                    destination: '/notifications',
                  },
                  {
                    label: 'Employee Rates',
                    destination: '/employee-rates',
                  },
                  {
                    label: 'Employee Permissions',
                    destination: '/employee-permissions',
                  },
                  {
                    label: 'Settings',
                    destination: '/settings',
                  },
                ]}
              />
              <IntercomProvider appId={process.env.VITE_INTERCOM_APP_ID!}>
                <Intercom>
                  <Routes pages={pages} />
                </Intercom>
              </IntercomProvider>
            </Pinger>
          </ReactQueryProvider>
        </AppBridgeProvider>
      </BrowserRouter>
    </PolarisProvider>
  );
}
