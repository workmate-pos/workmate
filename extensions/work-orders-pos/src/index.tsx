import { Navigator, render, Tile, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { WorkOrder } from './screens/WorkOrder';
import { ItemConfig } from './screens/popups/ItemConfig';
import { EmployeeSelector } from './screens/popups/EmployeeSelector';
import { ItemSelector } from './screens/popups/ItemSelector';
import { Error } from './screens/Error';
import { Entry } from './screens/Entry';
import { WorkOrderSelector } from './screens/popups/WorkOrderSelector';

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
    <Navigator>
      <Entry />
      <WorkOrder />
      <ItemConfig />
      <EmployeeSelector />
      <ItemSelector />
      <WorkOrderSelector />
      <Error />
    </Navigator>
  );
};

render('pos.home.tile.render', () => <SmartGridTile />);
render('pos.home.modal.render', () => <SmartGridModal />);
