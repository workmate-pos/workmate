import { reactExtension, Tile, useApi } from '@shopify/ui-extensions-react/point-of-sale';

export default reactExtension('pos.home.tile.render', () => {
  const { action } = useApi<'pos.home.tile.render'>();
  return <Tile title={'Special Orders'} subtitle={'WorkMate'} onPress={action.presentModal} enabled />;
});
