import { Tile, render, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { Router, WorkOrdersApp } from '@work-orders/work-orders-pos-internals';

const SmartGridTile = () => {
  const { smartGrid } = useExtensionApi();
  return <Tile title="Purchase Orders" subtitle="WorkMate" onPress={smartGrid.presentModal} enabled />;
};

const SmartGridModal = () => {
  return (
    <WorkOrdersApp>
      <Router mainRoute={'PurchaseOrderEntry'} />
    </WorkOrdersApp>
  );
};

render('pos.home.tile.render', () => <SmartGridTile />);
render('pos.home.modal.render', () => <SmartGridModal />);
