import { reactExtension, useApi } from '@shopify/ui-extensions-react/point-of-sale';
import { Tile } from '@shopify/ui-extensions-react/point-of-sale';

export default reactExtension('pos.home.tile.render', () => {
  const { action } = useApi();
  return <Tile title="Cycle Count" subtitle="WorkMate" onPress={action.presentModal} enabled />;
});
