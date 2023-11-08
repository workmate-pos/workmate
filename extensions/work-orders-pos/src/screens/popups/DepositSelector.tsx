import { useScreen } from '../../hooks/use-screen';
import { useSettings } from '../../hooks/use-settings';
import { Button, Stack } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';

export function DepositSelector() {
  const [subTotal, setSubTotal] = useState<number | null>(null);
  const { Screen, closePopup } = useScreen('DepositSelector', ({ subTotal }) => setSubTotal(subTotal));
  const settings = useSettings();

  return (
    <Screen title="Select Deposit" isLoading={!settings || subTotal === null}>
      <Stack alignment="center" direction="vertical" flex={1} paddingHorizontal="ExtraExtraLarge">
        {settings?.discountShortcuts?.map(({ unit, value }) => {
          const obj = (
            {
              percentage: {
                type: 'percentage',
                percentage: value,
                currencyAmount: Math.ceil((subTotal ?? 0) * (value / 100)),
              },
              currency: {
                type: 'currency',
                currencyAmount: value,
              },
            } as const
          )[unit];

          let title = formatUnitValue({ unit, value });

          if (obj.type === 'percentage') {
            title += ` (${formatUnitValue({ unit: 'currency', value: obj.currencyAmount })})`;
          }

          return <Button title={title} onPress={() => closePopup(obj)} />;
        })}
      </Stack>
    </Screen>
  );
}

function formatUnitValue({ unit, value }: { unit: 'percentage' | 'currency'; value: number }) {
  if (unit === 'percentage') {
    return `${value}%`;
  }

  if (unit === 'currency') {
    return `CA$ ${value}`;
  }

  return unit satisfies never;
}
