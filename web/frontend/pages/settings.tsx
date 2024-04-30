import { useToast } from '@teifi-digital/shopify-app-react';
import { useState } from 'react';
import { Frame, BlockStack, Page, InlineGrid } from '@shopify/polaris';
import { Loading, TitleBar } from '@shopify/app-bridge-react';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import type { ShopSettings } from '../../schemas/generated/shop-settings.js';
import { useSettingsMutation } from '../queries/use-settings-mutation.js';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { PermissionBoundary } from '../components/PermissionBoundary.js';
import { useCurrentEmployeeQuery } from '@work-orders/common/queries/use-current-employee-query.js';
import { DiscountSettings } from '@web/frontend/components/settings/cards/DiscountSettings.js';
import { WorkOrderSettings } from '@web/frontend/components/settings/cards/WorkOrderSettings.js';
import { LabourSettings } from '@web/frontend/components/settings/cards/LabourSettings.js';
import { PurchaseOrderSettings } from '@web/frontend/components/settings/cards/PurchaseOrderSettings.js';
import { RatesSettings } from '@web/frontend/components/settings/cards/RatesSettings.js';
import { WorkOrderRequestSettings } from '@web/frontend/components/settings/cards/WorkOrderRequestSettings.js';
import { EmailSettings } from '@web/frontend/components/settings/cards/EmailSettings.js';
import { PrintSettings } from '@web/frontend/components/settings/cards/PrintSettings.js';
import { PurchaseOrderWebhookSettings } from '@web/frontend/components/settings/cards/PurchaseOrderWebhookSettings.js';

export default function () {
  return (
    <Frame>
      <Page narrowWidth>
        <PermissionBoundary permissions={['read_settings']}>
          <Settings />
        </PermissionBoundary>
      </Page>
    </Frame>
  );
}

function Settings() {
  const [toast, setToastAction] = useToast();
  const [settings, setSettings] = useState<ShopSettings>(null!);

  const [defaultPurchaseOrderStatusValue, setDefaultPurchaseOrderStatusValue] = useState('');
  const [defaultWorkOrderStatusValue, setDefaultWorkOrderStatusValue] = useState('');

  const [purchaseOrderWebhookIsValid, setPurchaseOrderWebhookIsValid] = useState(true);

  const isValid = purchaseOrderWebhookIsValid;

  const fetch = useAuthenticatedFetch({ setToastAction });
  const settingsQuery = useSettingsQuery(
    { fetch },
    {
      refetchOnWindowFocus: false,
      onSuccess({ settings }) {
        setSettings(settings);
        setDefaultWorkOrderStatusValue(settings.defaultStatus);
        setDefaultPurchaseOrderStatusValue(settings.defaultPurchaseOrderStatus);
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
      },
    },
  );

  if (!settings) {
    return <Loading />;
  }

  const superuser = currentEmployeeQuery?.data?.superuser ?? false;
  const canWriteSettings = superuser || (currentEmployeeQuery?.data?.permissions?.includes('write_settings') ?? false);

  return (
    <>
      <TitleBar
        title="Settings"
        primaryAction={{
          content: 'Save',
          target: 'APP',
          loading: saveSettingsMutation.isLoading,
          disabled:
            settingsQuery.isLoading ||
            saveSettingsMutation.isLoading ||
            currentEmployeeQuery.isLoading ||
            !canWriteSettings ||
            !isValid,
          onAction() {
            saveSettingsMutation.mutate(settings);
          },
        }}
      />

      <BlockStack gap={{ xs: '800', sm: '400' }}>
        <InlineGrid columns={{ xs: '1fr', md: '2fr 5fr' }} gap="400">
          <DiscountSettings settings={settings} setSettings={setSettings} />
          <WorkOrderSettings
            settings={settings}
            setSettings={setSettings}
            defaultWorkOrderStatusValue={defaultWorkOrderStatusValue}
          />
          <PurchaseOrderSettings
            settings={settings}
            setSettings={setSettings}
            defaultPurchaseOrderStatusValue={defaultPurchaseOrderStatusValue}
          />
          <LabourSettings settings={settings} setSettings={setSettings} />
          <RatesSettings settings={settings} setSettings={setSettings} />
          <WorkOrderRequestSettings settings={settings} setSettings={setSettings} />
          <EmailSettings settings={settings} setSettings={setSettings} />
          <PrintSettings settings={settings} setSettings={setSettings} />
          <PurchaseOrderWebhookSettings
            settings={settings}
            setSettings={setSettings}
            onIsValid={setPurchaseOrderWebhookIsValid}
          />
        </InlineGrid>
      </BlockStack>

      {toast}
    </>
  );
}
