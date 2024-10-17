import type { ShopSettings } from '@web/services/settings/schema.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';
import { BlockStack } from '@shopify/polaris';
import { NumberField } from '@web/frontend/components/NumberField.js';
import { Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';

export function RatesSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: (settings: ShopSettings) => void;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const currencyFormatter = useCurrencyFormatter({ fetch });

  return (
    <>
      <BlockStack gap="400">
        <NumberField
          decimals={2}
          type={'number'}
          label={'Default hourly rate'}
          value={settings.workOrders.charges.defaultHourlyRate}
          prefix={currencyFormatter.prefix}
          suffix={currencyFormatter.suffix}
          step={0.01}
          largeStep={1}
          min={0}
          inputMode={'decimal'}
          requiredIndicator
          onChange={(defaultHourlyRate: Money) =>
            setSettings({
              ...settings,
              workOrders: {
                ...settings.workOrders,
                charges: {
                  ...settings.workOrders.charges,
                  defaultHourlyRate,
                },
              },
            })
          }
          autoComplete={'off'}
          helpText={'Used for employees without a set hourly rate'}
        />
      </BlockStack>
      {toast}
    </>
  );
}
