import { reactExtension, Tile } from '@shopify/ui-extensions-react/point-of-sale';

export default reactExtension('pos.home.tile.render', ({ action, session }) => (
  <Tile
    title={'Work Orders'}
    subtitle={`${session.currentSession.staffMemberId}`}
    onPress={() => action.presentModal()}
    enabled
  />
));
