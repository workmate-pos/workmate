import { render, Tile, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { ReactQueryProvider } from './providers/ReactQueryProvider.js';
import { DialogProvider } from '@teifi-digital/pos-tools/providers/DialogProvider.js';
import { ScreenSizeProvider } from '@teifi-digital/pos-tools/providers/ScreenSizeProvider.js';
import { AppProvider } from '@teifi-digital/pos-tools/providers/AppProvider.js';
import { Router } from './routes.js';

function SmartGridTile() {
  const api = useExtensionApi<'pos.home.tile.render'>();

  return <Tile title={'Work Orders'} subtitle={'WorkMate'} onPress={() => api.smartGrid.presentModal()} enabled />;
}

function SmartGridModal() {
  return (
    <AppProvider appUrl={"https://workmate-fbg.teifi.dev"!}>
      <ReactQueryProvider>
        <DialogProvider>
          <ScreenSizeProvider>
            <Router />
          </ScreenSizeProvider>
        </DialogProvider>
      </ReactQueryProvider>
    </AppProvider>
  );
}

render('pos.home.tile.render', () => <SmartGridTile />);
render('pos.home.modal.render', () => <SmartGridModal />);
