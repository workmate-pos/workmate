import { render, Tile, useExtensionApi, Navigator } from '@shopify/retail-ui-extensions-react';
import { WorkOrderPage } from './screens/WorkOrder.js';
import { EmployeeSelector } from './screens/popups/EmployeeSelector.js';
import { Error } from './screens/Error.js';
import { ReactQueryProvider } from './providers/ReactQueryProvider.js';
import { StatusSelector } from './screens/popups/StatusSelector.js';
import { CustomerSelector } from './screens/popups/CustomerSelector.js';
import { ShippingConfig } from './screens/popups/ShippingConfig.js';
import { Entry } from './screens/Entry.js';
import { WorkOrderSaved } from './screens/popups/WorkOrderSaved.js';
import { ProductLineItemConfig } from './screens/popups/ProductLineItemConfig.js';
import { ProductSelector } from './screens/popups/ProductSelector.js';
import { DiscountSelector } from './screens/popups/DiscountSelector.js';
import { ServiceSelector } from './screens/popups/ServiceSelector.js';
import { EmployeeLabourConfig } from './screens/popups/EmployeeLabourConfig.js';
import { ImportOrderSelector } from './screens/ImportOrderSelector.js';
import { LabourLineItemConfig } from './screens/popups/LabourLineItemConfig.js';
import { OrderPreview } from './screens/popups/OrderPreview.js';
import { DialogProvider } from '@teifi-digital/pos-tools/providers/DialogProvider.js';
import { ScreenSizeProvider } from '@teifi-digital/pos-tools/providers/ScreenSizeProvider.js';
import { AppProvider } from '@teifi-digital/pos-tools/providers/AppProvider.js';

function SmartGridTile() {
  const api = useExtensionApi<'pos.home.tile.render'>();

  return (
    <Tile
      title={'Work Orders'}
      subtitle={'WorkMate'}
      onPress={() => {
        api.smartGrid.presentModal();
      }}
      enabled
    />
  );
}

function SmartGridModal() {
  return (
    <AppProvider appUrl={process.env.APP_URL!}>
      <ReactQueryProvider>
        <DialogProvider>
          <ScreenSizeProvider>
            <Navigator>
              <Entry />
              <Error />
              <ImportOrderSelector />
              <WorkOrderPage />

              <CustomerSelector />
              <DiscountSelector />
              <EmployeeLabourConfig />
              <EmployeeSelector />
              <OrderPreview />
              <ProductLineItemConfig />
              <ProductSelector />

              <LabourLineItemConfig />
              <ServiceSelector />
              <ShippingConfig />
              <StatusSelector />
              <WorkOrderSaved />
            </Navigator>
          </ScreenSizeProvider>
        </DialogProvider>
      </ReactQueryProvider>
    </AppProvider>
  );
}

render('pos.home.tile.render', () => <SmartGridTile />);
render('pos.home.modal.render', () => <SmartGridModal />);
