import { Button, Stack } from '@shopify/retail-ui-extensions-react';
import { useScreen } from '../../hooks/use-screen.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useAuthenticatedFetch } from '../../hooks/use-authenticated-fetch.js';

export function StatusSelector() {
  const { Screen, closePopup } = useScreen('StatusSelector');
  const fetch = useAuthenticatedFetch();
  const settingsQuery = useSettingsQuery({ fetch });
  const settings = settingsQuery.data?.settings;

  return (
    <Screen title="Select Status" presentation={{ sheet: true }} isLoading={settingsQuery.isLoading}>
      <Stack alignment="center" direction="vertical" flex={1} paddingHorizontal="ExtraExtraLarge">
        {settings?.statuses.map(status => <Button title={status} onPress={() => closePopup(status)} />)}
      </Stack>
    </Screen>
  );
}
