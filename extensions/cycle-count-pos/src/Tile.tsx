import { reactExtension, useApi } from '@shopify/ui-extensions-react/point-of-sale';
import { Tile } from '@shopify/ui-extensions-react/point-of-sale';

export default reactExtension('pos.home.tile.render', ({ action }) => (
  <Tile title="Cycle Count" subtitle="WorkMate" onPress={action.presentModal} enabled />
));
