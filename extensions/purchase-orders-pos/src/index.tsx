import React from 'react';
import { Tile, Navigator, render, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { Entry } from './screens/Entry.js';
import { ScreenSizeProvider } from '@work-orders/common-pos/providers/ScreenSizeProvider.js';

const SmartGridTile = () => {
  const { smartGrid } = useExtensionApi();
  return <Tile title="Purchase Orders" subtitle="WorkMate" onPress={smartGrid.presentModal} enabled />;
};

const SmartGridModal = () => {
  return (
    <ScreenSizeProvider>
      <Navigator>
        <Entry />
      </Navigator>
    </ScreenSizeProvider>
  );
};

render('pos.home.tile.render', () => <SmartGridTile />);
render('pos.home.modal.render', () => <SmartGridModal />);
