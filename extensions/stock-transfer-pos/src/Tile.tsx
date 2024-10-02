import { reactExtension, Tile, useApi } from '@shopify/ui-extensions-react/point-of-sale';
import { WorkMateAppShell } from '@work-orders/work-orders-pos-internals';
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { sum } from '@teifi-digital/shopify-app-toolbox/array';
import { useEffect } from 'react';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { SECOND_IN_MS } from '@work-orders/common/time/constants.js';
import { useStockTransferCountQuery } from '@work-orders/common/queries/use-stock-transfer-count-query.js';

export default reactExtension('pos.home.tile.render', () => (
  <WorkMateAppShell>
    <TileWithNotifications />
  </WorkMateAppShell>
));

function TileWithNotifications() {
  const { session, action } = useApi<'pos.home.tile.render'>();
  const fetch = useAuthenticatedFetch({ showToastOnError: false });

  const locationId = createGid('Location', session.currentSession.locationId);

  const incomingTransferCountQuery = useStockTransferCountQuery({
    fetch,
    toLocationId: locationId,
    status: 'IN_TRANSIT',
  });

  const outgoingTransferCountQuery = useStockTransferCountQuery({
    fetch,
    fromLocationId: locationId,
    status: 'PENDING',
  });

  const showBadgeBadge = !!incomingTransferCountQuery.data || !!outgoingTransferCountQuery.data;
  const badgeValue = showBadgeBadge
    ? sum([incomingTransferCountQuery.data?.count ?? 0, outgoingTransferCountQuery.data?.count ?? 0])
    : undefined;

  useEffect(() => {
    // for some reason refetchInterval doesn't work
    const interval = setInterval(() => {
      incomingTransferCountQuery.refetch();
      outgoingTransferCountQuery.refetch();
    }, 10 * SECOND_IN_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <Tile
      title={'Stock Transfers'}
      subtitle={'WorkMate'}
      onPress={() => action.presentModal()}
      enabled
      badgeValue={badgeValue}
    />
  );
}
