import { Button, Stepper, Stack, Text, ScrollView } from '@shopify/ui-extensions-react/point-of-sale';
import { useState } from 'react';
import { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';
import { BigDecimal, Decimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { useRouter } from '../../routes.js';

export function DiscountSelector({ onSelect }: { onSelect: (discount: CreateWorkOrder['discount']) => void }) {
  const fetch = useAuthenticatedFetch();
  const settings = useSettingsQuery({ fetch })?.data?.settings;

  const shortcuts = settings?.workOrders.discountShortcuts;
  const rules = settings?.workOrders.discountRules;

  const shortcutButtons: NonNullable<CreateWorkOrder['discount']>[] =
    shortcuts?.map(shortcut =>
      shortcut.unit === 'currency'
        ? ({
            type: 'FIXED_AMOUNT',
            value: shortcut.money,
          } as const)
        : ({
            type: 'PERCENTAGE',
            value: shortcut.percentage,
          } as const),
    ) ?? [];

  const customInputAllowed = !rules?.onlyAllowShortcuts;
  const allowedCurrencyRange = rules?.onlyAllowShortcuts
    ? null
    : rules?.allowedCurrencyRange
      ? ([rules.allowedCurrencyRange[0], rules.allowedCurrencyRange[1]] as const)
      : null;
  const allowedPercentageRange = rules?.onlyAllowShortcuts ? null : rules?.allowedPercentageRange;

  const [currencyValue, setCurrencyValue] = useState<Money>(allowedCurrencyRange?.[0] ?? BigDecimal.ZERO.toMoney());
  const [percentageValue, setPercentageValue] = useState<Decimal>(
    allowedPercentageRange?.[0] ?? BigDecimal.ZERO.toDecimal(),
  );

  const currencyFormatter = useCurrencyFormatter();

  const router = useRouter();

  return (
    <ScrollView>
      <Stack direction="vertical" spacing={8}>
        <Stack direction="vertical" spacing={2} paddingVertical={'Medium'}>
          <Stack direction="horizontal" spacing={2} alignment={'center'} paddingVertical={'ExtraLarge'}>
            <Text variant="headingLarge">Shortcuts</Text>
          </Stack>

          <ResponsiveGrid columns={3}>
            {shortcutButtons.map((shortcut, i) => {
              let title = '';

              if (shortcut.type === 'PERCENTAGE') {
                title = `${shortcut.value}%`;
              } else if (shortcut.type === 'FIXED_AMOUNT') {
                title = currencyFormatter(shortcut.value);
              }

              return (
                <Button
                  key={i}
                  title={title}
                  onPress={() => {
                    router.popCurrent();
                    onSelect(shortcut);
                  }}
                />
              );
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
                minimumValue={Number(allowedCurrencyRange?.[0] ?? 0)}
                maximumValue={Number(allowedCurrencyRange?.[1] ?? Infinity)}
                initialValue={Number(currencyValue)}
                value={Number(currencyValue)}
                onValueChanged={(value: number) => setCurrencyValue(BigDecimal.fromString(String(value)).toMoney())}
              />
              <Button
                title={currencyFormatter(currencyValue)}
                onPress={() => onSelect({ type: 'FIXED_AMOUNT', value: currencyValue })}
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
                minimumValue={allowedPercentageRange?.[0] ? Number(allowedPercentageRange[0]) : 0}
                maximumValue={allowedPercentageRange?.[1] ? Number(allowedPercentageRange[1]) : undefined}
                initialValue={Number(percentageValue)}
                value={Number(percentageValue)}
                onValueChanged={percentage => setPercentageValue(BigDecimal.fromString(String(percentage)).toDecimal())}
              />
              <Button
                title={`${percentageValue}%`}
                onPress={() => onSelect({ type: 'PERCENTAGE', value: percentageValue })}
              />
            </Stack>
          </Stack>
        )}

        <Button
          title={'Remove'}
          type={'destructive'}
          onPress={() => {
            router.popCurrent();
            onSelect(null);
          }}
        />
      </Stack>
    </ScrollView>
  );
}
