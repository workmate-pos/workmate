import { Navigator, render, Tile, useExtensionApi } from '@shopify/retail-ui-extensions-react';
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
import { EmployeeAssignmentConfig } from './screens/popups/EmployeeAssignmentConfig.js';
import { ImportOrderSelector } from './screens/ImportOrderSelector.js';
import { ServiceLineItemConfig } from './screens/popups/ServiceLineItemConfig.js';

function SmartGridTile() {
  const api = useExtensionApi<'pos.home.tile.render'>();

  return (
    <Tile
      title="Work Orders"
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
      <Navigator>
        <Entry />
        <Error />
        <ImportOrderSelector />
        <WorkOrderPage />

        <CustomerSelector />
        <DiscountSelector />
        <EmployeeAssignmentConfig />
        <EmployeeSelector />
        <ProductLineItemConfig />
        <ProductSelector />
        <ServiceLineItemConfig />
        <ServiceSelector />
        <ShippingConfig />
        <StatusSelector />
        <WorkOrderSaved />
      </Navigator>
    </ReactQueryProvider>
  );
}

render('pos.home.tile.render', () => <SmartGridTile />);
render('pos.home.modal.render', () => <SmartGridModal />);
