import { Button, Stepper, Stack, Text, ScrollView } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { Decimal, Money } from '@web/schemas/generated/shop-settings.js';
import { BigDecimal, RoundingMode } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { usePaymentHandler } from '../../hooks/use-payment-handler.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useCalculatedDraftOrderQuery } from '@work-orders/common/queries/use-calculated-draft-order-query.js';
import { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';

export function DepositSelector({ createWorkOrder }: { createWorkOrder: CreateWorkOrder }) {
  const [customAmountValue, setCustomAmountValue] = useState(0);
  const [customPercentageValue, setCustomPercentageValue] = useState(0);

  const fetch = useAuthenticatedFetch();

  const calculatedWorkOrderQuery = useCalculatedDraftOrderQuery({
    fetch,
    name: createWorkOrder.name,
    items: createWorkOrder.items,
    charges: createWorkOrder.charges,
    customerId: createWorkOrder.customerId,
    discount: null,
  });
  const calculatedWorkOrder = calculatedWorkOrderQuery.data;

  const settingsQuery = useSettingsQuery(
    { fetch },
    {
      onSuccess({ settings }) {
        if (settings.depositRules.allowedCurrencyRange) {
          setCustomAmountValue(Number(settings.depositRules.allowedCurrencyRange[0]));
        }

        if (settings.depositRules.allowedPercentageRange) {
          setCustomPercentageValue(Number(settings.depositRules.allowedPercentageRange[0]));
        }
      },
    },
  );
  const settings = settingsQuery.data?.settings;

  const currencyFormatter = useCurrencyFormatter();
  const paymentHandler = usePaymentHandler();

  const screen = useScreen();
  screen.setIsLoading(calculatedWorkOrderQuery.isLoading || settingsQuery.isLoading || paymentHandler.isLoading);

  const error = calculatedWorkOrderQuery.error || settingsQuery.error;
  if (error) throw error;
  if (!calculatedWorkOrder || !settings) return null;

  const handleDeposit = (amount: Money) => {
    if (!createWorkOrder.name) throw new Error('No work order name set');

    paymentHandler.handleDeposit({
      workOrderName: createWorkOrder.name,
      deposit: amount,
      customerId: createWorkOrder.customerId,
    });
  };

  const percentageToMoney = (percentage: number | Decimal) => {
    const percentageFactor = BigDecimal.fromString(String(percentage)).divide(BigDecimal.fromString('100'));
    const workOrderTotal = BigDecimal.fromMoney(calculatedWorkOrder.total);
    return workOrderTotal.multiply(percentageFactor).round(2, RoundingMode.CEILING).toMoney();
  };

  const depositShortcuts = settings.depositShortcuts.map(shortcut => {
    if (shortcut.unit === 'percentage') {
      return { ...shortcut, money: percentageToMoney(shortcut.percentage) };
    }

    return shortcut;
  });

  const highestDepositShortcutMoney = BigDecimal.max(
    BigDecimal.ZERO,
    ...depositShortcuts.map(shortcut => BigDecimal.fromMoney(shortcut.money)),
  );

  return (
    <ScrollView>
      <Stack direction="vertical" spacing={8}>
        <Text variant="headingLarge">Shortcuts</Text>
        <ResponsiveGrid columns={3}>
          {depositShortcuts.map((shortcut, i) => {
            const disabled =
              BigDecimal.fromMoney(shortcut.money).compare(BigDecimal.ZERO) <= 0 ||
              (settings.depositRules.onlyAllowHighestAbsoluteShortcut &&
                BigDecimal.fromMoney(shortcut.money).compare(highestDepositShortcutMoney) < 0);

            if (shortcut.unit === 'currency') {
              return (
                <Button
                  key={i}
                  title={currencyFormatter(shortcut.money)}
                  onPress={() => handleDeposit(shortcut.money)}
                  isDisabled={disabled}
                />
              );
            }

            if (shortcut.unit === 'percentage') {
              return (
                <Button
                  key={i}
                  title={`${shortcut.percentage}% (${currencyFormatter(shortcut.money)})`}
                  onPress={() => handleDeposit(shortcut.money)}
                  isDisabled={disabled}
                />
              );
            }

            return shortcut satisfies never;
          })}
        </ResponsiveGrid>

        {!settings.depositRules.onlyAllowShortcuts && (
          <>
            <Text variant="headingLarge">Custom Amount</Text>
            <Stack direction={'vertical'} spacing={2}>
              <Stepper
                minimumValue={settings.depositRules.allowedCurrencyRange?.[0] ?? 0}
                maximumValue={settings.depositRules.allowedCurrencyRange?.[1] ?? Infinity}
                initialValue={customAmountValue}
                value={customAmountValue}
                onValueChanged={setCustomAmountValue}
              />
              <Button
                title={currencyFormatter(customAmountValue)}
                onPress={() => handleDeposit(BigDecimal.fromString(customAmountValue.toFixed(2)).toMoney())}
                isDisabled={customAmountValue <= 0}
              />
            </Stack>

            <Text variant="headingLarge">Custom Percentage</Text>
            <Stack direction={'vertical'} spacing={2}>
              <Stepper
                minimumValue={settings.depositRules.allowedPercentageRange?.[0] ?? 0}
                maximumValue={settings.depositRules.allowedPercentageRange?.[1] ?? 100}
                initialValue={customPercentageValue}
                value={customPercentageValue}
                onValueChanged={setCustomPercentageValue}
              />
              <Button
                title={`${customPercentageValue}% (${currencyFormatter(percentageToMoney(customPercentageValue))})`}
                onPress={() => handleDeposit(percentageToMoney(customPercentageValue))}
                isDisabled={customPercentageValue <= 0}
              />
            </Stack>
          </>
        )}
      </Stack>
    </ScrollView>
  );
}
