import { Button, Stack } from '@shopify/retail-ui-extensions-react';
import { useScreen } from '../../hooks/use-screen.js';
import { useAuthenticatedFetch } from '@work-orders/common-pos/hooks/use-authenticated-fetch.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';

export function StatusSelector() {
  const { Screen, closePopup } = useScreen('StatusSelector');
  const fetch = useAuthenticatedFetch();
  const settings = useSettingsQuery({ fetch })?.data?.settings;

  return (
    <Screen title="Select Status" presentation={{ sheet: true }}>
      <Stack alignment="center" direction="vertical" flex={1} paddingHorizontal="ExtraExtraLarge">
        {settings?.statuses.map(status => <Button title={status} onPress={() => closePopup(status)} />)}
      </Stack>
    </Screen>
  );
}
