import { Tile, render, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { ScreenSizeProvider } from '@work-orders/common-pos/providers/ScreenSizeProvider.js';
import { QueryClient, QueryClientProvider } from '@work-orders/common/queries/react-query.js';
import { DialogProvider } from '@work-orders/common-pos/providers/DialogProvider.js';
import { Router } from './routes.js';

const SmartGridTile = () => {
  const { smartGrid } = useExtensionApi();
  return <Tile title="Purchase Orders" subtitle="WorkMate" onPress={smartGrid.presentModal} enabled />;
};

const SmartGridModal = () => {
  const queryClient = new QueryClient();

  return (
    <ScreenSizeProvider>
      <QueryClientProvider client={queryClient}>
        <DialogProvider>
          <Router />
        </DialogProvider>
      </QueryClientProvider>
    </ScreenSizeProvider>
  );
};

render('pos.home.tile.render', () => <SmartGridTile />);
render('pos.home.modal.render', () => <SmartGridModal />);
