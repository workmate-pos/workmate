import { render, Tile, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { WorkOrdersApp, Router } from '@work-orders/work-orders-pos-internals';

function SmartGridTile() {
  const api = useExtensionApi<'pos.home.tile.render'>();

  return <Tile title={'New Work Order'} subtitle={'WorkMate'} onPress={() => api.smartGrid.presentModal()} enabled />;
}

function SmartGridModal() {
  return (
    <WorkOrdersApp>
      <Router mainRoute={'NewWorkOrder'} />
    </WorkOrdersApp>
  );
}

render('pos.home.tile.render', () => <SmartGridTile />);
render('pos.home.modal.render', () => <SmartGridModal />);
