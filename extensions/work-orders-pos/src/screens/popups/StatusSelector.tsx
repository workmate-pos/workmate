import { useScreen } from '../../hooks/use-screen';
import { useSettingsQuery } from '../../queries/use-settings-query';
import { Button, Stack } from '@shopify/retail-ui-extensions-react';

export function StatusSelector() {
  const { Screen, closePopup } = useScreen('StatusSelector');
  const settingsQuery = useSettingsQuery();
  const settings = settingsQuery.data?.settings;

  return (
    <Screen title="Select Status" presentation={{ sheet: true }} isLoading={settingsQuery.isLoading}>
      <Stack alignment="center" direction="vertical" flex={1} paddingHorizontal="ExtraExtraLarge">
        {settings?.statuses.map(status => <Button title={status.name} onPress={() => closePopup(status.name)} />)}
      </Stack>
    </Screen>
  );
}
