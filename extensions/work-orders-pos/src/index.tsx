import { Banner, Navigator, render, Tile, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { WorkOrder } from './screens/WorkOrder';
import { ItemConfig } from './screens/popups/ItemConfig';
import { EmployeeSelector } from './screens/popups/EmployeeSelector';
import { ItemSelector } from './screens/popups/ItemSelector';
import { Error } from './screens/Error';
import { WorkOrderSelector } from './screens/popups/WorkOrderSelector';
import { ReactQueryProvider } from './providers/ReactQueryProvider';
import { SettingsProvider } from './providers/SettingsProvider';
import { StatusSelector } from './screens/popups/StatusSelector';
import { CustomerSelector } from './screens/popups/CustomerSelector';
import { DiscountOrDepositSelector } from './screens/popups/DiscountOrDepositSelector';
import { ShippingConfig } from './screens/popups/ShippingConfig';
import { NewEntry } from './screens/NewEntry';

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
      <SettingsProvider>
        <Navigator>
          <NewEntry />
          <Error />
          <WorkOrder />

          <CustomerSelector />
          <DiscountOrDepositSelector />
          <EmployeeSelector />
          <ItemConfig />
          <ItemSelector />
          <ShippingConfig />
          <StatusSelector />
          <WorkOrderSelector />
        </Navigator>
      </SettingsProvider>
    </ReactQueryProvider>
  );
}

render('pos.home.tile.render', () => <SmartGridTile />);
render('pos.home.modal.render', () => <SmartGridModal />);