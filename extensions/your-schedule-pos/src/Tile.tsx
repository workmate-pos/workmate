import { reactExtension, Tile } from '@shopify/ui-extensions-react/point-of-sale';

export default reactExtension('pos.home.tile.render', ({ action }) => (
  <Tile title={'Your Schedule'} subtitle={'WorkMate'} onPress={() => action.presentModal()} enabled />
));