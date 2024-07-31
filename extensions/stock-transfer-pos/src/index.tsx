import { render, Tile, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { AppProvider } from '@teifi-digital/pos-tools/providers/AppProvider.js';
import { DialogProvider } from '@teifi-digital/pos-tools/providers/DialogProvider.js';
import { ScreenSizeProvider } from '@teifi-digital/pos-tools/providers/ScreenSizeProvider.js';
import { Router } from './routes.js';
import { ReactQueryProvider } from './providers/ReactQueryProvider.js';
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useStockTransferCountQuery } from '@work-orders/common/queries/use-stock-transfer-count-query.js';
import { sum } from '@teifi-digital/shopify-app-toolbox/array';
import { SECOND_IN_MS } from '@work-orders/common/time/constants.js';
import { useEffect, useState } from 'react';

function SmartGridTile() {
  return (
    <AppProvider appUrl={"https://work-orders-staging.teifi.dev"!}>
      <ReactQueryProvider>
        <TileWithNotifications />
      </ReactQueryProvider>
    </AppProvider>
  );
}

function TileWithNotifications() {
  const { session, smartGrid } = useExtensionApi<'pos.home.tile.render'>();
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
      onPress={() => smartGrid.presentModal()}
      enabled
      badgeValue={badgeValue}
    />
  );
}

function SmartGridModal() {
  return (
    <AppProvider appUrl={"https://work-orders-staging.teifi.dev"!}>
      <ReactQueryProvider>
        <DialogProvider>
          <ScreenSizeProvider>
            <Router mainRoute={'Entry'} />
          </ScreenSizeProvider>
        </DialogProvider>
      </ReactQueryProvider>
    </AppProvider>
  );
}

render('pos.home.tile.render', () => <SmartGridTile />);
render('pos.home.modal.render', () => <SmartGridModal />);
