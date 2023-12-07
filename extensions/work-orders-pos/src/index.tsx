import { Navigator, render, Tile, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { WorkOrderPage } from './screens/WorkOrder.js';
import { ProductConfig } from './screens/popups/ProductConfig';
import { EmployeeSelector } from './screens/popups/EmployeeSelector.js';
import { ProductSelector } from './screens/popups/ProductSelector';
import { Error } from './screens/Error.js';
import { ReactQueryProvider } from './providers/ReactQueryProvider.js';
import { StatusSelector } from './screens/popups/StatusSelector.js';
import { CustomerSelector } from './screens/popups/CustomerSelector.js';
import { DiscountOrDepositSelector } from './screens/popups/DiscountOrDepositSelector.js';
import { ShippingConfig } from './screens/popups/ShippingConfig.js';
import { Entry } from './screens/Entry.js';
import { WorkOrderSaved } from './screens/popups/WorkOrderSaved.js';
import { ServiceSelector } from './screens/popups/ServiceSelector';
import { ServiceConfig } from './screens/popups/ServiceConfig';
import { ServiceEmployeeAssignmentConfig } from './screens/popups/ServiceEmployeeAssignmentConfig';
import { ImportOrderSelector } from './screens/ImportOrderSelector';

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
        <ImportOrderSelector />
        <Error />
        <WorkOrderPage />

        <CustomerSelector />
        <DiscountOrDepositSelector />
        <EmployeeSelector />
        <ProductConfig />
        <ProductSelector />
        <ServiceConfig />
        <ServiceEmployeeAssignmentConfig />
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
