import { reactExtension, Tile } from '@shopify/ui-extensions-react/point-of-sale';

export default reactExtension('pos.home.tile.render', ({ action, session }) => (
  <Tile
    title={'New Work Order'}
    subtitle={`${session.currentSession.userId}`}
    onPress={() => action.presentModal()}
    enabled
  />
));