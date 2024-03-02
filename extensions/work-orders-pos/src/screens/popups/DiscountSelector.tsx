import { Button, Stepper, Stack, Text, ScrollView } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { Decimal, Money } from '@web/schemas/generated/shop-settings.js';
import { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';

export function DiscountSelector({
  subTotal,
  onSelect,
}: {
  subTotal: Money;
  onSelect: (discount: CreateWorkOrder['discount']) => void;
}) {
  const fetch = useAuthenticatedFetch();
  const settings = useSettingsQuery({ fetch })?.data?.settings;

  const shortcuts = settings?.discountShortcuts;
  const rules = settings?.discountRules;

  const shortcutButtons = shortcuts?.map(shortcut =>
    shortcut.unit === 'currency'
      ? ({
          valueType: 'FIXED_AMOUNT',
          value: shortcut.money,
        } as const)
      : ({
          valueType: 'PERCENTAGE',
          value: shortcut.percentage,
        } as const),
  );

  const customInputAllowed = !rules?.onlyAllowShortcuts;
  const allowedCurrencyRange = rules?.allowedCurrencyRange
    ? [rules.allowedCurrencyRange[0], rules.allowedCurrencyRange[1]]
    : null;
  const allowedPercentageRange = rules?.allowedPercentageRange;

  const [currencyValue, setCurrencyValue] = useState<Money>(allowedCurrencyRange?.[0] ?? BigDecimal.ZERO.toMoney());
  const [percentageValue, setPercentageValue] = useState<Decimal>(
    allowedPercentageRange?.[0] ?? BigDecimal.ZERO.toDecimal(),
  );

  const currencyFormatter = useCurrencyFormatter();

  const getPercentageCurrencyAmount = (percentage: Decimal) =>
    BigDecimal.fromDecimal(percentage)
      .divide(BigDecimal.fromString('100'), 2)
      .multiply(BigDecimal.fromString(subTotal ?? '0'))
      .toMoney();

  return (
    <ScrollView>
      <Stack direction="vertical" spacing={8}>
        <Stack direction="vertical" spacing={2} paddingVertical={'Medium'}>
          <Stack direction="horizontal" spacing={2} alignment={'center'} paddingVertical={'ExtraLarge'}>
            <Text variant="headingLarge">Shortcuts</Text>
          </Stack>

          <ResponsiveGrid columns={3}>
            {shortcutButtons?.map(shortcut => {
              let title = '';

              if (shortcut.valueType === 'PERCENTAGE') {
                title = `${shortcut.value}% (${currencyFormatter(getPercentageCurrencyAmount(shortcut.value))})`;
              } else if (shortcut.valueType === 'FIXED_AMOUNT') {
                title = currencyFormatter(shortcut.value);
              }

              return <Button title={title} onPress={() => onSelect(shortcut)} />;
            })}
          </ResponsiveGrid>
        </Stack>

        {customInputAllowed && (
          <Stack direction="vertical" spacing={2} paddingVertical={'Medium'}>
            <Stack direction="horizontal" spacing={2} alignment={'center'} paddingVertical={'ExtraLarge'}>
              <Text variant="headingLarge">Custom Amount</Text>
            </Stack>

            <Stack direction="horizontal" alignment="center" flexChildren paddingHorizontal="ExtraExtraLarge">
              <Stepper
                minimumValue={allowedCurrencyRange?.[0] ?? 0}
                maximumValue={allowedCurrencyRange?.[1]}
                initialValue={currencyValue}
                value={currencyValue}
                onValueChanged={setCurrencyValue}
              />
              <Button
                title={currencyFormatter(currencyValue)}
                onPress={() => onSelect({ valueType: 'FIXED_AMOUNT', value: currencyValue })}
              />
            </Stack>
          </Stack>
        )}

        {customInputAllowed && (
          <Stack direction="vertical" spacing={2} paddingVertical={'Medium'}>
            <Stack direction="horizontal" spacing={2} alignment={'center'} paddingVertical={'ExtraLarge'}>
              <Text variant="headingLarge">Custom %</Text>
            </Stack>

            <Stack direction="horizontal" alignment="center" flexChildren paddingHorizontal="ExtraExtraLarge">
              <Stepper
                minimumValue={allowedPercentageRange?.[0] ?? 0}
                maximumValue={allowedPercentageRange?.[1]}
                initialValue={percentageValue}
                value={percentageValue}
                onValueChanged={setPercentageValue}
              />
              <Button
                title={`${percentageValue}% (${currencyFormatter(getPercentageCurrencyAmount(percentageValue))})`}
                onPress={() => onSelect({ valueType: 'PERCENTAGE', value: percentageValue })}
              />
            </Stack>
          </Stack>
        )}
      </Stack>
    </ScrollView>
  );
}
