import { useScreen } from '../../hooks/use-screen';
import { useState } from 'react';
import { Button, Stack } from '@shopify/retail-ui-extensions-react';

export function ShippingConfig() {
  const { Screen, closePopup } = useScreen('ShippingConfig');
  const [value, setValue] = useState(100);

  // <Stepper value={value} onValueChanged={setValue} minimumValue={0} initialValue={value} />
  // <Button title={`Custom - CA$ ${value}`} onPress={() => closePopup(value)} />

  return (
    <Screen title="Shipping">
      <Stack alignment="center" direction="vertical" flex={1} paddingHorizontal="ExtraExtraLarge">
        <Button title="No Shipping" onPress={() => closePopup(0)} />
        <Button title="M - 51cm x 41cm x 41cm - CA$ 50" onPress={() => closePopup(50)} />
        <Button title="L - 59cm x 40cm x 37cm - CA$ 75" onPress={() => closePopup(75)} />
        <Button title="XL - 60cm x 48cm x 42cm - CA$ 100" onPress={() => closePopup(100)} />
      </Stack>
    </Screen>
  );
}
