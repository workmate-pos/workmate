import { Button, Stack } from '@shopify/ui-extensions-react/point-of-sale';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useRouter } from '../../routes.js';

export function StatusSelector({ onSelect }: { onSelect: (status: string) => void }) {
  const fetch = useAuthenticatedFetch();
  const settings = useSettingsQuery({ fetch })?.data?.settings;

  const router = useRouter();

  return (
    <Stack alignment="center" direction="vertical" flex={1} paddingHorizontal="ExtraExtraLarge">
      {settings?.workOrders.statuses.map(status => (
        <Button
          key={status}
          title={status}
          onPress={() => {
            onSelect(status);
            router.popCurrent();
          }}
        />
      ))}
    </Stack>
  );
}
