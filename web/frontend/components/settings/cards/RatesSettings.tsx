import type { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';
import { BlockStack, Box, Card, Text } from '@shopify/polaris';
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
      <Box as="section" paddingInlineStart={{ xs: '400', sm: '0' }} paddingInlineEnd={{ xs: '400', sm: '0' }}>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Rates
          </Text>
        </BlockStack>
      </Box>
      <Card roundedAbove="sm">
        <BlockStack gap="400">
          <NumberField
            decimals={2}
            type={'number'}
            label={'Default hourly rate'}
            value={String(settings.defaultRate)}
            prefix={currencyFormatter.prefix}
            suffix={currencyFormatter.suffix}
            step={0.01}
            largeStep={1}
            min={0}
            inputMode={'decimal'}
            requiredIndicator
            onChange={(value: Money) => setSettings({ ...settings, defaultRate: value })}
            autoComplete={'off'}
            helpText={'Used for employees without a set hourly rate'}
          />
        </BlockStack>
      </Card>
      {toast}
    </>
  );
}
