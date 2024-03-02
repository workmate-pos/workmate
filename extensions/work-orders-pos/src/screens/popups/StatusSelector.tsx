import { Button, Stack } from '@shopify/retail-ui-extensions-react';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';

export function StatusSelector({ onSelect }: { onSelect: (status: string) => void }) {
  const fetch = useAuthenticatedFetch();
  const settings = useSettingsQuery({ fetch })?.data?.settings;

  return (
    <Stack alignment="center" direction="vertical" flex={1} paddingHorizontal="ExtraExtraLarge">
      {settings?.statuses.map(status => <Button title={status} onPress={() => onSelect(status)} />)}
    </Stack>
  );
}
