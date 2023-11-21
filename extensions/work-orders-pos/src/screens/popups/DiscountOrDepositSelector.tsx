import { useScreen } from '../../hooks/use-screen';
import { useSettingsQuery } from '../../queries/use-settings-query';
import { Button, Stepper, Stack, Text, ScrollView } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter';

export function DiscountOrDepositSelector() {
  const [selectType, setSelectType] = useState<'discount' | 'deposit' | null>(null);
  const [subTotal, setSubTotal] = useState<number | null>(null);
  const { Screen, closePopup } = useScreen('DiscountOrDepositSelector', ({ subTotal, select }) => {
    setSelectType(select);
    setSubTotal(subTotal);
  });
  const settingsQuery = useSettingsQuery();
  const settings = settingsQuery.data?.settings;

  const shortcuts = {
    none: undefined,
    discount: settings?.discountShortcuts,
    deposit: settings?.depositShortcuts,
  }[selectType ?? 'none'];

  const rules = {
    none: undefined,
    discount: settings?.discountRules,
    deposit: settings?.depositRules,
  }[selectType ?? 'none'];

  const title = {
    none: '',
    discount: 'Discount',
    deposit: 'Deposit',
  }[selectType ?? 'none'];

  const onlyAllowHighestDiscount =
    selectType === 'deposit' && settings?.depositRules?.onlyAllowHighestAbsoluteShortcut === true;

  const shortcutButtons = shortcuts?.map(
    ({ unit, value }) =>
      (
        ({
          percentage: {
            select: selectType!,
            type: 'percentage',
            percentage: value,
            currencyAmount: Math.ceil((subTotal ?? 0) * (value / 100)),
          },
          currency: {
            select: selectType!,
            type: 'currency',
            currencyAmount: value,
          },
        }) as const
      )[unit],
  );

  const highestDiscountButton =
    onlyAllowHighestDiscount && shortcutButtons && shortcutButtons.length
      ? shortcutButtons.reduce((prev, current) => (current.currencyAmount > prev.currencyAmount ? current : prev))
      : null;

  const customInputAllowed = !rules?.onlyAllowShortcuts;

  const allowedCurrencyRange = rules?.allowedCurrencyRange;
  const allowedPercentageRange = rules?.allowedPercentageRange;

  const [currencyValue, setCurrencyValue] = useState<number>(allowedCurrencyRange?.[0] ?? 0);
  const [percentageValue, setPercentageValue] = useState<number>(allowedPercentageRange?.[0] ?? 0);

  const percentageValueCurrencyAmount = Math.ceil((subTotal ?? 0) * (percentageValue / 100));

  const currencyFormatter = useCurrencyFormatter();

  return (
    <Screen title={`Select ${title}`} isLoading={settingsQuery.isLoading || subTotal === null || selectType === null}>
      <ScrollView>
        <Stack direction="vertical" spacing={8}>
          <Stack direction="vertical" spacing={2}>
            <Text variant="headingLarge">Shortcuts</Text>
            <Stack alignment="center" direction="horizontal" flex={1} flexChildren paddingHorizontal="ExtraExtraLarge">
              {shortcutButtons?.map(obj => {
                let title = '';

                if (obj.type === 'percentage') {
                  title = `${obj.percentage}% (${currencyFormatter(obj.currencyAmount)})`;
                } else if (obj.type === 'currency') {
                  title = currencyFormatter(obj.currencyAmount);
                }

                return (
                  <Button
                    title={title}
                    onPress={() => closePopup(obj)}
                    isDisabled={highestDiscountButton !== null && highestDiscountButton !== obj}
                  />
                );
              })}
            </Stack>
          </Stack>

          {customInputAllowed && (
            <Stack direction="vertical" spacing={2}>
              <Text variant="headingLarge">Custom Amount</Text>

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
                  onPress={() => closePopup({ select: selectType!, type: 'currency', currencyAmount: currencyValue })}
                />
              </Stack>
            </Stack>
          )}

          {customInputAllowed && (
            <Stack direction="vertical" spacing={2}>
              <Text variant="headingLarge">Custom %</Text>
              <Stack direction="horizontal" alignment="center" flexChildren paddingHorizontal="ExtraExtraLarge">
                <Stepper
                  minimumValue={allowedPercentageRange?.[0] ?? 0}
                  maximumValue={allowedPercentageRange?.[1]}
                  initialValue={percentageValue}
                  value={percentageValue}
                  onValueChanged={setPercentageValue}
                />
                <Button
                  title={`${percentageValue}% (${currencyFormatter(percentageValueCurrencyAmount)})`}
                  onPress={() =>
                    closePopup({
                      select: selectType!,
                      type: 'percentage',
                      percentage: percentageValue,
                      currencyAmount: percentageValueCurrencyAmount,
                    })
                  }
                />
              </Stack>
            </Stack>
          )}
        </Stack>
      </ScrollView>
    </Screen>
  );
}
