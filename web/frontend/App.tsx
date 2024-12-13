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
                    label: 'Work orders',
                    destination: '/work-orders',
                  },
                  {
                    label: 'Purchase orders',
                    destination: '/purchase-orders',
                  },
                  {
                    label: 'Special orders',
                    destination: '/special-orders',
                  },
                  {
                    label: 'Serials',
                    destination: '/serials',
                  },
                  {
                    label: 'Schedule',
                    destination: '/schedule',
                  },
                  {
                    label: 'Services and labour',
                    destination: '/services-and-labour',
                  },
                  {
                    label: 'Employees',
                    destination: '/employees',
                  },
                  {
                    label: 'Inventory log',
                    destination: '/inventory-log',
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
