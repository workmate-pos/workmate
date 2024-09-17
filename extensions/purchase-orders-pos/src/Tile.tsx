import { reactExtension, Tile, useApi } from '@shopify/ui-extensions-react/point-of-sale';

export default reactExtension('pos.home.tile.render', () => {
  const { action } = useApi();
  return <Tile title="Purchase Orders" subtitle="WorkMate" onPress={action.presentModal} enabled />;
});
