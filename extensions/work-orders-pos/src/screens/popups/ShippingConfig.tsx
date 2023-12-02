import { Button, Stack } from '@shopify/retail-ui-extensions-react';
import { useScreen } from '../../hooks/use-screen.js';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter.js';

export function ShippingConfig() {
  const { Screen, closePopup } = useScreen('ShippingConfig');
  const currencyFormatter = useCurrencyFormatter();

  const options: [description: string, currencyAmount: number][] = [
    ['M - 51cm x 41cm x 41cm', 50],
    ['L - 59cm x 40cm x 37cm', 75],
    ['XL - 60cm x 48cm x 42cm', 100],
  ];

  return (
    <Screen title="Shipping">
      <Stack alignment="center" direction="vertical" flex={1} paddingHorizontal="ExtraExtraLarge">
        <Button title="No Shipping" onPress={() => closePopup(0)} />
        {options.map(([description, currencyAmount]) => (
          <Button
            key={description}
            title={`${description} - ${currencyFormatter(currencyAmount)}`}
            onPress={() => closePopup(currencyAmount)}
          />
        ))}
      </Stack>
    </Screen>
  );
}
