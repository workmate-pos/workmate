import { Button, ScrollView, Stack, Text } from '@shopify/ui-extensions-react/point-of-sale';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { useRouter } from '../../routes.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';

export function PurchaseOrderStatusSelector({ onSelect }: { onSelect: (status: string) => void }) {
  const fetch = useAuthenticatedFetch();
  const settingsQuery = useSettingsQuery({ fetch });

  const router = useRouter();
  const screen = useScreen();
  screen.setIsLoading(settingsQuery.isLoading);

  if (settingsQuery.isError || !settingsQuery.data?.settings) {
    return (
      <Stack alignment="center" direction="vertical" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(settingsQuery.error, 'An error occurred while loading settings')}
        </Text>
      </Stack>
    );
  }

  return (
    <ScrollView>
      <Stack alignment="center" direction="vertical" flex={1} paddingHorizontal="ExtraExtraLarge">
        {settingsQuery.data.settings.purchaseOrderStatuses.map(status => (
          <Button
            key={status}
            title={titleCase(status)}
            onPress={() => {
              onSelect(status);
              router.popCurrent();
            }}
          />
        ))}
      </Stack>
    </ScrollView>
  );
}
