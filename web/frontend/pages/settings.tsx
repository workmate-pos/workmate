import { useToast } from '@teifi-digital/shopify-app-react';
import { Dispatch, SetStateAction, useState } from 'react';
import { Frame, BlockStack, Page, Tabs, Box, Divider, LegacyCard } from '@shopify/polaris';
import { ContextualSaveBar, Loading, useAppBridge } from '@shopify/app-bridge-react';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import type { ShopSettings } from '../../schemas/generated/shop-settings.js';
import { useSettingsMutation } from '../queries/use-settings-mutation.js';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { PermissionBoundary } from '../components/PermissionBoundary.js';
import { useCurrentEmployeeQuery } from '@work-orders/common/queries/use-current-employee-query.js';
import { DiscountSettings } from '@web/frontend/components/settings/sections/DiscountSettings.js';
import { WorkOrderSettings } from '@web/frontend/components/settings/sections/WorkOrderSettings.js';
import { LabourSettings } from '@web/frontend/components/settings/sections/LabourSettings.js';
import { PurchaseOrderSettings } from '@web/frontend/components/settings/sections/PurchaseOrderSettings.js';
import { RatesSettings } from '@web/frontend/components/settings/sections/RatesSettings.js';
import { EmailSettings } from '@web/frontend/components/settings/sections/EmailSettings.js';
import { PrintSettings } from '@web/frontend/components/settings/sections/PrintSettings.js';
import { PurchaseOrderWebhookSettings } from '@web/frontend/components/settings/sections/PurchaseOrderWebhookSettings.js';
import { useSearchParams } from 'react-router-dom';
import { Redirect } from '@shopify/app-bridge/actions';
import { WorkOrderRequestSettings } from '@web/frontend/components/settings/sections/WorkOrderRequestSettings.js';
import { CustomerMetafieldSettings } from '@web/frontend/components/settings/sections/CustomerMetafieldSettings.js';
import { StockTransferSettings } from '@web/frontend/components/settings/sections/StockTransferSettings.js';
import { CustomFieldSettings } from '@web/frontend/components/settings/sections/CustomFieldSettings.js';
import { CycleCountSettings } from '@web/frontend/components/settings/sections/CycleCountSettings.js';
import { SpecialOrderSettings } from '@web/frontend/components/settings/sections/SpecialOrderSettings.js';
import { NotificationSettings } from '@web/frontend/components/settings/sections/NotificationSettings.js';
import { WorkOrderNotificationSettings } from '@web/frontend/components/settings/sections/WorkOrderNotificationSettings.js';
import { SpecialOrderNotificationSettings } from '@web/frontend/components/special-orders/SpecialOrderNotificationSettings.js';

export default function () {
  return (
    <Frame>
      <Page>
        <PermissionBoundary permissions={['read_settings']}>
          <Settings />
        </PermissionBoundary>
      </Page>
    </Frame>
  );
}

function Settings() {
  const app = useAppBridge();
  const [toast, setToastAction] = useToast();
  const [searchParams] = useSearchParams();
  const [settings, _setSettings] = useState<ShopSettings>(null!);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const setSettings: Dispatch<SetStateAction<ShopSettings>> = arg => {
    _setSettings(arg);
    setHasUnsavedChanges(true);
  };

  const [purchaseOrderWebhookIsValid, setPurchaseOrderWebhookIsValid] = useState(true);

  const isValid = purchaseOrderWebhookIsValid;

  const fetch = useAuthenticatedFetch({ setToastAction });
  const settingsQuery = useSettingsQuery(
    { fetch },
    {
      refetchOnWindowFocus: false,
      onSuccess({ settings }) {
        setSettings(settings);
        setHasUnsavedChanges(false);
      },
      onError() {
        setToastAction({
          content: 'Could not load settings',
          action: {
            content: 'Retry',
            onAction() {
              settingsQuery.refetch();
            },
          },
        });
      },
    },
  );

  const currentEmployeeQuery = useCurrentEmployeeQuery({ fetch });

  const saveSettingsMutation = useSettingsMutation(
    { fetch },
    {
      onSuccess() {
        setToastAction({
          content: 'Saved settings',
        });
        setHasUnsavedChanges(false);
      },
    },
  );

  const superuser = currentEmployeeQuery?.data?.superuser ?? false;
  const canWriteSettings = superuser || (currentEmployeeQuery?.data?.permissions?.includes('write_settings') ?? false);

  if (!settings) {
    return <Loading />;
  }

  const tabs = [
    {
      name: 'Work Orders',
      tab: (
        <>
          <WorkOrderSettings
            settings={settings}
            setSettings={setSettings}
            defaultWorkOrderStatusValue={settings.defaultStatus}
          />
          <Divider />
          <WorkOrderNotificationSettings settings={settings} setSettings={setSettings} />
          <Divider />
          <DiscountSettings settings={settings} setSettings={setSettings} />
          <Divider />
          <LabourSettings settings={settings} setSettings={setSettings} />
          <Divider />
          <RatesSettings settings={settings} setSettings={setSettings} />
          <Divider />
          <WorkOrderRequestSettings settings={settings} setSettings={setSettings} />
          <Divider />
          <CustomFieldSettings type="WORK_ORDER" />
        </>
      ),
    },
    {
      name: 'Purchase Orders',
      tab: (
        <>
          <PurchaseOrderSettings
            settings={settings}
            setSettings={setSettings}
            defaultPurchaseOrderStatusValue={settings.defaultPurchaseOrderStatus}
          />
          <Divider />
          <CustomerMetafieldSettings settings={settings} setSettings={setSettings} />
          <Divider />
          <CustomFieldSettings type="PURCHASE_ORDER" />
        </>
      ),
    },
    {
      name: 'Line Items',
      tab: <CustomFieldSettings type="LINE_ITEM" />,
    },
    {
      name: 'Stock Transfers',
      tab: <StockTransferSettings settings={settings} setSettings={setSettings} />,
    },
    {
      name: 'Cycle Counts',
      tab: (
        <CycleCountSettings
          settings={settings}
          setSettings={setSettings}
          defaultStatus={settings.cycleCount.defaultStatus}
        />
      ),
    },
    {
      name: 'Special Orders',
      tab: (
        <>
          <SpecialOrderSettings settings={settings} setSettings={setSettings} />
          <Divider />
          <SpecialOrderNotificationSettings settings={settings} setSettings={setSettings} />
        </>
      ),
    },
    {
      name: 'Notifications',
      tab: <NotificationSettings settings={settings} setSettings={setSettings} />,
    },
    {
      name: 'Printing',
      tab: (
        <>
          <PrintSettings settings={settings} setSettings={setSettings} />
          <Divider />
          <EmailSettings settings={settings} setSettings={setSettings} />
        </>
      ),
    },
    {
      name: 'Custom Fields',
      tab: <CustomFieldSettings />,
    },
    {
      name: 'Integrations',
      tab: (
        <PurchaseOrderWebhookSettings
          settings={settings}
          setSettings={setSettings}
          onIsValid={setPurchaseOrderWebhookIsValid}
        />
      ),
    },
  ];

  const selectedTab = Math.max(
    tabs.findIndex(tab => tab.name === searchParams.get('tab')),
    0,
  );

  return (
    <>
      <ContextualSaveBar
        visible={hasUnsavedChanges}
        fullWidth
        saveAction={{
          disabled: !canWriteSettings || !isValid,
          loading: saveSettingsMutation.isLoading,
          onAction: () => saveSettingsMutation.mutate(settings),
        }}
        leaveConfirmationDisable
        discardAction={{
          onAction: () => {
            if (settingsQuery.data?.settings) {
              setSettings(settingsQuery.data.settings);
              setHasUnsavedChanges(false);
            }
          },
        }}
      />

      <LegacyCard>
        <Tabs
          tabs={tabs.map(tab => ({ id: tab.name, content: tab.name }))}
          selected={selectedTab}
          onSelect={tab => {
            Redirect.create(app).dispatch(Redirect.Action.APP, `/settings?tab=${encodeURIComponent(tabs[tab]!.name)}`);
          }}
        >
          <Box paddingBlock={'400'} paddingInline={'400'}>
            <BlockStack gap={'800'}>{tabs[selectedTab]?.tab}</BlockStack>
          </Box>
        </Tabs>
      </LegacyCard>

      {toast}
    </>
  );
}
