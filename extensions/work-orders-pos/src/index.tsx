import { Navigator, render, Tile, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { WorkOrder } from './screens/WorkOrder';
import { ItemConfig } from './screens/popups/ItemConfig';
import { EmployeeSelector } from './screens/popups/EmployeeSelector';
import { ItemSelector } from './screens/popups/ItemSelector';
import { Error } from './screens/Error';
import { Entry } from './screens/Entry';
import { WorkOrderSelector } from './screens/popups/WorkOrderSelector';
import { ReactQueryProvider } from './providers/ReactQueryProvider';
import { SettingsProvider } from './providers/SettingsProvider';
import { StatusSelector } from './screens/popups/StatusSelector';
import { CustomerSelector } from './screens/popups/CustomerSelector';
import { DepositSelector } from './screens/popups/DepositSelector';
import { DiscountSelector } from './screens/popups/DiscountSelector';
import { ShippingConfig } from './screens/popups/ShippingConfig';

const SmartGridTile = () => {
  const api = useExtensionApi<'pos.home.tile.render'>();
  return (
    <Tile
      title="Work Order"
      onPress={() => {
        api.smartGrid.presentModal();
      }}
      enabled
    />
  );
};

const SmartGridModal = () => {
  return (
    <ReactQueryProvider>
      <SettingsProvider>
        <Navigator>
          <Entry />
          <Error />
          <WorkOrder />

          <CustomerSelector />
          <DepositSelector />
          <DiscountSelector />
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
};

render('pos.home.tile.render', () => <SmartGridTile />);
render('pos.home.modal.render', () => <SmartGridModal />);
