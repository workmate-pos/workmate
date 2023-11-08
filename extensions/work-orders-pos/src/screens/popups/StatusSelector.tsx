import { useScreen } from '../../hooks/use-screen';
import { useSettings } from '../../hooks/use-settings';
import { Button, Stack } from '@shopify/retail-ui-extensions-react';

export function StatusSelector() {
  const { Screen, closePopup } = useScreen('StatusSelector');
  const settings = useSettings();

  return (
    <Screen title="Select Status">
      <Stack alignment="center" direction="vertical" flex={1} paddingHorizontal="ExtraExtraLarge">
        {settings?.statuses.map(status => <Button title={status.name} onPress={() => closePopup(status.name)} />)}
      </Stack>
    </Screen>
  );
}
