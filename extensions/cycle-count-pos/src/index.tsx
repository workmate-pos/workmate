import { Tile, render, useExtensionApi, Navigator, Screen } from '@shopify/retail-ui-extensions-react';
import { QueryClient, QueryClientProvider } from '@work-orders/common/queries/react-query.js';
import { Router } from './routes.js';
import { ScreenSizeProvider } from '@teifi-digital/pos-tools/providers/ScreenSizeProvider.js';
import { DialogProvider } from '@teifi-digital/pos-tools/providers/DialogProvider.js';
import { AppProvider } from '@teifi-digital/pos-tools/providers/AppProvider.js';

const SmartGridTile = () => {
  const { smartGrid } = useExtensionApi();
  return <Tile title="Cycle Count" subtitle="WorkMate" onPress={smartGrid.presentModal} enabled />;
};

const SmartGridModal = () => {
  const queryClient = new QueryClient();

  return (
    <AppProvider appUrl={process.env.APP_URL!}>
      <ScreenSizeProvider>
        <QueryClientProvider client={queryClient}>
          <DialogProvider>
            <Router mainRoute={'Entry'} />
          </DialogProvider>
        </QueryClientProvider>
      </ScreenSizeProvider>
    </AppProvider>
  );
};

render('pos.home.tile.render', () => <SmartGridTile />);
render('pos.home.modal.render', () => <SmartGridModal />);
