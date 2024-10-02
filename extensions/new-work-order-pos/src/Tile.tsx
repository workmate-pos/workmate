import { reactExtension, Tile, useApi } from '@shopify/ui-extensions-react/point-of-sale';

export default reactExtension('pos.home.tile.render', ({ action }) => (
  <Tile title={'New Work Order'} subtitle={'WorkMate'} onPress={() => action.presentModal()} enabled />
));
