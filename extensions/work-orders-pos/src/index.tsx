import { Navigator, render, Tile, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { WorkOrder } from './screens/WorkOrder.js';
import { ItemConfig } from './screens/popups/ItemConfig.js';
import { EmployeeSelector } from './screens/popups/EmployeeSelector.js';
import { ItemSelector } from './screens/popups/ItemSelector.js';
import { Error } from './screens/Error.js';
import { ReactQueryProvider } from './providers/ReactQueryProvider.js';
import { StatusSelector } from './screens/popups/StatusSelector.js';
import { CustomerSelector } from './screens/popups/CustomerSelector.js';
import { DiscountOrDepositSelector } from './screens/popups/DiscountOrDepositSelector.js';
import { ShippingConfig } from './screens/popups/ShippingConfig.js';
import { Entry } from './screens/Entry.js';
import { WorkOrderSaved } from './screens/popups/WorkOrderSaved.js';

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
        <WorkOrder />

        <CustomerSelector />
        <DiscountOrDepositSelector />
        <EmployeeSelector />
        <ItemConfig />
        <ItemSelector />
        <ShippingConfig />
        <StatusSelector />
        <WorkOrderSaved />
      </Navigator>
    </ReactQueryProvider>
  );
}

render('pos.home.tile.render', () => <SmartGridTile />);
render('pos.home.modal.render', () => <SmartGridModal />);
