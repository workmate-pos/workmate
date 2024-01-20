import { Button, Stepper, Stack, Text, ScrollView } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useScreen } from '../../hooks/use-screen.js';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter.js';
import { Grid } from '../../components/Grid.js';
import { useAuthenticatedFetch } from '../../hooks/use-authenticated-fetch.js';
import { parseMoney } from '@work-orders/common/util/money.js';

export function DiscountSelector() {
  const [subTotal, setSubTotal] = useState<number | null>(null);
  const { Screen, closePopup } = useScreen('DiscountSelector', ({ subTotal }) => setSubTotal(subTotal));

  const fetch = useAuthenticatedFetch();
  const settingsQuery = useSettingsQuery({ fetch });
  const settings = settingsQuery.data?.settings;

  const shortcuts = settings?.discountShortcuts;
  const rules = settings?.discountRules;

  const shortcutButtons = shortcuts?.map(shortcut =>
    shortcut.unit === 'currency'
      ? ({
          valueType: 'FIXED_AMOUNT',
          value: parseMoney(shortcut.money),
        } as const)
      : ({
          valueType: 'PERCENTAGE',
          value: shortcut.percentage,
        } as const),
  );

  const customInputAllowed = !rules?.onlyAllowShortcuts;
  const allowedCurrencyRange = rules?.allowedCurrencyRange
    ? [parseMoney(rules.allowedCurrencyRange[0]), parseMoney(rules.allowedCurrencyRange[1])]
    : null;
  const allowedPercentageRange = rules?.allowedPercentageRange;

  const [currencyValue, setCurrencyValue] = useState<number>(allowedCurrencyRange?.[0] ?? 0);
  const [percentageValue, setPercentageValue] = useState<number>(allowedPercentageRange?.[0] ?? 0);

  const currencyFormatter = useCurrencyFormatter();

  const getPercentageCurrencyAmount = (percentage: number) => Math.ceil((subTotal ?? 0) * (percentage / 100));

  return (
    <Screen
      title={'Select discount'}
      isLoading={settingsQuery.isLoading || subTotal === null}
      presentation={{ sheet: true }}
    >
      <ScrollView>
        <Stack direction="vertical" spacing={8}>
          <Stack direction="vertical" spacing={2} paddingVertical={'Medium'}>
            <Stack direction="horizontal" spacing={2} alignment={'center'} paddingVertical={'ExtraLarge'}>
              <Text variant="headingLarge">Shortcuts</Text>
            </Stack>

            <Grid columns={3}>
              {shortcutButtons?.map(shortcut => {
                let title = '';

                if (shortcut.valueType === 'PERCENTAGE') {
                  title = `${shortcut.value}% (${currencyFormatter(getPercentageCurrencyAmount(shortcut.value))})`;
                } else if (shortcut.valueType === 'FIXED_AMOUNT') {
                  title = currencyFormatter(shortcut.value);
                }

                return <Button title={title} onPress={() => closePopup(shortcut)} />;
              })}
            </Grid>
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
                  onPress={() => closePopup({ valueType: 'FIXED_AMOUNT', value: currencyValue })}
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
                  onPress={() =>
                    closePopup({
                      valueType: 'PERCENTAGE',
                      value: percentageValue,
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
