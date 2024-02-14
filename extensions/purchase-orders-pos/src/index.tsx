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
import { CustomFieldConfig } from './screens/popups/CustomFieldConfig.js';
import { PurchaseOrder } from './screens/PurchaseOrder.js';
import { EmployeeSelector } from './screens/popups/EmployeeSelector.js';
import { WorkOrderSelector } from './screens/popups/WorkOrderSelector.js';
import { OrderSelector } from './screens/popups/OrderSelector.js';
import { ProductCreator } from './screens/popups/ProductCreator.js';
import { SavePreset } from './screens/popups/SavePreset.js';
import { ImportPreset } from './screens/popups/ImportPreset.js';

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
            <PurchaseOrder />

            <CustomFieldConfig />
            <EmployeeSelector />
            <ImportPreset />
            <LocationSelector />
            <OrderSelector />
            <ProductConfig />
            <ProductCreator />
            <ProductSelector />
            <SavePreset />
            <StatusSelector />
            <VendorSelector />
            <WorkOrderSelector />
          </Navigator>
        </DialogProvider>
      </QueryClientProvider>
    </ScreenSizeProvider>
  );
};

render('pos.home.tile.render', () => <SmartGridTile />);
render('pos.home.modal.render', () => <SmartGridModal />);
