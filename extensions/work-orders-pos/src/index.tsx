import { render, Tile, useExtensionApi, Navigator } from '@shopify/retail-ui-extensions-react';
import { WorkOrderPage } from './screens/WorkOrder.js';
import { EmployeeSelector } from './screens/popups/EmployeeSelector.js';
import { Error } from './screens/Error.js';
import { ReactQueryProvider } from './providers/ReactQueryProvider.js';
import { StatusSelector } from './screens/popups/StatusSelector.js';
import { CustomerSelector } from './screens/popups/CustomerSelector.js';
import { ShippingConfig } from './screens/popups/ShippingConfig.js';
import { Entry } from './screens/Entry.js';
import { WorkOrderSaved } from './screens/popups/WorkOrderSaved.js';
import { ProductLineItemConfig } from './screens/popups/ProductLineItemConfig.js';
import { ProductSelector } from './screens/popups/ProductSelector.js';
import { DiscountSelector } from './screens/popups/DiscountSelector.js';
import { ServiceSelector } from './screens/popups/ServiceSelector.js';
import { EmployeeLabourConfig } from './screens/popups/EmployeeLabourConfig.js';
import { ImportOrderSelector } from './screens/ImportOrderSelector.js';
import { LabourLineItemConfig } from './screens/popups/LabourLineItemConfig.js';
import { UnsavedChangesDialogProvider } from '@work-orders/common-pos/providers/UnsavedChangesDialogProvider.js';
import { OrderPreview } from './screens/popups/OrderPreview.js';
import { SettingsProvider, useSettingsInternal } from './providers/SettingsProvider.js';
import { useEffect } from 'react';
import { extractErrorMessage } from './util/errors.js';
import { useScreen } from './hooks/use-screen.js';

function SmartGridTile() {
  const api = useExtensionApi<'pos.home.tile.render'>();

  return (
    <Tile
      title={'WorkMate'}
      onPress={() => {
        api.smartGrid.presentModal();
      }}
      enabled
    />
  );
}

function SmartGridModal() {
  return (
    <ReactQueryProvider>
      <UnsavedChangesDialogProvider>
        <SettingsProvider>
          <WrappedNavigator />
        </SettingsProvider>
      </UnsavedChangesDialogProvider>
    </ReactQueryProvider>
  );
}

/**
 * Navigator that only loads in screens when the settings are loaded.
 * Not very clean.
 *
 * It is possible to rerender the navigator by supplying `key={settings}`,
 * and conditionally rendering `LoadingSettingsScreen`.
 * But Shopify POS seems to have messed up rendering causing this to flash
 */
function WrappedNavigator() {
  const { Screen: LoadingSettingsScreen, navigate } = useScreen('LoadingSettings');

  const settingsQuery = useSettingsInternal();

  useEffect(() => {
    if (settingsQuery?.isError) {
      navigate('Error', extractErrorMessage(settingsQuery.error, 'Failed to load settings'));
    } else if (settingsQuery?.data?.settings) {
      navigate('Entry');
    }
  }, [settingsQuery?.isError, settingsQuery?.data]);

  return (
    <Navigator>
      <LoadingSettingsScreen title={'Loading settings'} isLoading={true} />
      <Error />

      {settingsQuery?.data && (
        <>
          <Entry />
          <ImportOrderSelector />
          <WorkOrderPage />

          <CustomerSelector />
          <DiscountSelector />
          <EmployeeLabourConfig />
          <EmployeeSelector />
          <OrderPreview />
          <ProductLineItemConfig />
          <ProductSelector />

          <LabourLineItemConfig />
          <ServiceSelector />
          <ShippingConfig />
          <StatusSelector />
          <WorkOrderSaved />
        </>
      )}
    </Navigator>
  );
}

render('pos.home.tile.render', () => <SmartGridTile />);
render('pos.home.modal.render', () => <SmartGridModal />);
