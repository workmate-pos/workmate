import React from 'react';
import { Tile, Navigator, render, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { Entry } from './screens/Entry.js';
import { ScreenSizeProvider } from '@work-orders/common-pos/providers/ScreenSizeProvider.js';
import { StatusSelector } from './screens/popups/StatusSelector.js';
import { ProductSelector } from './screens/popups/ProductSelector.js';
import { QueryClient, QueryClientProvider } from '@work-orders/common/queries/react-query.js';
import { LocationSelector } from './screens/popups/LocationSelector.js';
import { ProductConfig } from './screens/popups/ProductConfig.js';
import { VendorSelector } from './screens/popups/VendorSelector.js';
import { DialogProvider } from '@work-orders/common-pos/providers/DialogProvider.js';

const SmartGridTile = () => {
  const { smartGrid } = useExtensionApi();
  return <Tile title="Purchase Orders" subtitle="WorkMate" onPress={smartGrid.presentModal} enabled />;
};

const SmartGridModal = () => {
  const queryClient = new QueryClient();
  return (
    <ScreenSizeProvider>
      <QueryClientProvider client={queryClient}>
        <DialogProvider>
          <Navigator>
            <Entry />

            <LocationSelector />
            <ProductConfig />
            <ProductSelector />
            <StatusSelector />
            <VendorSelector />
          </Navigator>
        </DialogProvider>
      </QueryClientProvider>
    </ScreenSizeProvider>
  );
};

render('pos.home.tile.render', () => <SmartGridTile />);
render('pos.home.modal.render', () => <SmartGridModal />);
