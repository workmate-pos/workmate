import React from 'react';
import {Tile, Text, Screen, Navigator, render, useExtensionApi} from '@shopify/retail-ui-extensions-react';

const SmartGridTile = () => {
  const api = useExtensionApi();
  return (
    <Tile
      title="My app"
      subtitle="SmartGrid Extension"
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
      <Screen name="HelloWorld" title="Hello World!">
        <Text>Welcome to the extension!</Text>
      </Screen>
    </Navigator>
  );
}

render('pos.home.tile.render', () => <SmartGridTile />);
render('pos.home.modal.render', () => <SmartGridModal />);
