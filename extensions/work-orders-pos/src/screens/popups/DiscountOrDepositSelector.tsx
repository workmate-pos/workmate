import { useScreen } from '../../hooks/use-screen';
import { useSettings } from '../../hooks/use-settings';
import { Button, Stepper, Stack, Text, ScrollView } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';

export function DiscountOrDepositSelector() {
  const [selectType, setSelectType] = useState<'discount' | 'deposit' | null>(null);
  const [subTotal, setSubTotal] = useState<number | null>(null);
  const { Screen, closePopup } = useScreen('DiscountOrDepositSelector', ({ subTotal, select }) => {
    setSelectType(select);
    setSubTotal(subTotal);
  });
  const settings = useSettings();

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

  return (
    <Screen title={`Select ${title}`} isLoading={!settings || subTotal === null || selectType === null}>
      <ScrollView>
        <Stack direction="vertical" spacing={8}>
          <Stack direction="vertical" spacing={2}>
            <Text variant="headingLarge">Shortcuts</Text>
            <Stack alignment="center" direction="horizontal" flex={1} flexChildren paddingHorizontal="ExtraExtraLarge">
              {shortcutButtons?.map(obj => {
                let title = '';

                if (obj.type === 'percentage') {
                  title = `${obj.percentage}% (CA$ ${obj.currencyAmount.toFixed(2)})`;
                } else if (obj.type === 'currency') {
                  title = `CA$ ${obj.currencyAmount.toFixed(2)}`;
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
              <Text variant="headingLarge">Custom CA$</Text>

              <Stack direction="horizontal" alignment="center" flexChildren paddingHorizontal="ExtraExtraLarge">
                <Stepper
                  minimumValue={allowedCurrencyRange?.[0] ?? 0}
                  maximumValue={allowedCurrencyRange?.[1]}
                  initialValue={currencyValue}
                  value={currencyValue}
                  onValueChanged={setCurrencyValue}
                />
                <Button
                  title={`CA$ ${currencyValue}`}
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
                  title={`${percentageValue}% (CA$ ${((subTotal ?? 0) * (percentageValue / 100)).toFixed(2)})`}
                  onPress={() =>
                    closePopup({
                      select: selectType!,
                      type: 'percentage',
                      percentage: percentageValue,
                      currencyAmount: Math.ceil((subTotal ?? 0) * (percentageValue / 100)),
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