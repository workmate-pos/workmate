import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { ListPopup, SelectListPopupAction } from '@work-orders/common-pos/screens/ListPopup.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useRouter } from '../routes.js';

export function StatusSelector({ onSelect, onClear }: { onSelect: (status: string) => void; onClear?: () => void }) {
  const fetch = useAuthenticatedFetch();
  const settingsQuery = useSettingsQuery({ fetch });

  const screen = useScreen();
  screen.setTitle('Select Status');
  screen.setIsLoading(settingsQuery.isLoading);

  const router = useRouter();

  const actions: SelectListPopupAction<string>[] = onClear
    ? [
        {
          title: 'Clear',
          type: 'plain',
          onAction: () => {
            onClear();
            router.popCurrent();
          },
        },
      ]
    : [];

  if (settingsQuery.isError) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(settingsQuery.error, 'An error occurred while loading settings')}
        </Text>
      </Stack>
    );
  }

  const statuses = settingsQuery.data?.settings.cycleCount.statuses ?? [];

  return (
    <ListPopup
      title={'Select Status'}
      selection={{
        type: 'select',
        items: statuses.map(status => ({ id: status, leftSide: { label: status } })),
        onSelect,
        actions,
      }}
      useRouter={useRouter}
    />
  );
}
