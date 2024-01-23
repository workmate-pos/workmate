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
import { UnsavedChangesDialogProvider } from './providers/UnsavedChangesDialogProvider.js';
import { OrderPreview } from './screens/popups/OrderPreview.js';

function SmartGridTile() {
  const api = useExtensionApi<'pos.home.tile.render'>();

  return (
    <Tile
      title={'WorkMate'}
      onPress={() => {
        api.smartGrid.presentModal();
      }}
      enabled
    />
  );
}

function SmartGridModal() {
  return (
    <ReactQueryProvider>
      <UnsavedChangesDialogProvider>
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
      </UnsavedChangesDialogProvider>
    </ReactQueryProvider>
  );
}

render('pos.home.tile.render', () => <SmartGridTile />);
render('pos.home.modal.render', () => <SmartGridModal />);
