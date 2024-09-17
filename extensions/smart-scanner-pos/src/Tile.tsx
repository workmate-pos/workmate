import { reactExtension, Tile, useApi } from '@shopify/ui-extensions-react/point-of-sale';

export default reactExtension('pos.home.tile.render', () => {
  const api = useApi<'pos.home.tile.render'>();
  return <Tile title={'Scanner'} subtitle={'WorkMate'} onPress={() => api.action.presentModal()} enabled />;
});
