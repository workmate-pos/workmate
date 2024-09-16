import { Button, List, ListRow, ScrollView, Stack, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useSpecialOrderQuery } from '@work-orders/common/queries/use-special-order-query.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useMemo } from 'react';
import { getSubtitle } from '@work-orders/common-pos/util/subtitle.js';
import { useRouter } from '../../routes.js';

// TODO: Merge with WorkOrderNotificationHistory

export function SpecialOrderNotificationHistory({ name, disabled }: { name: string; disabled: boolean }) {
  const fetch = useAuthenticatedFetch();

  const specialOrderQuery = useSpecialOrderQuery({ fetch, name });
  const specialOrder = specialOrderQuery.data;
  const historicalNotifications = useMemo(
    () => specialOrder?.notifications?.reverse() ?? [],
    [specialOrder?.notifications],
  );

  const settingsQuery = useSettingsQuery({ fetch });
  const settings = settingsQuery.data?.settings;

  const allNotifications = settings?.specialOrders.notifications ?? [];
  const router = useRouter();
  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  return (
    <ScrollView>
      <Stack direction="vertical" spacing={2}>
        <Button
          title={'Send Notification'}
          disabled={disabled}
          onPress={() => {
            if (allNotifications.length === 0) {
              toast.show('No notifications available');
              return;
            }

            if (allNotifications.length === 1) {
              router.push('SpecialOrderNotificationConfig', {
                name,
                notification: allNotifications[0]!,
              });
            } else {
              router.push('SpecialOrderNotificationPicker', {
                name,
                notifications: allNotifications,
              });
            }
          }}
          isLoading={settingsQuery.isLoading}
        />

        <List
          imageDisplayStrategy={'never'}
          isLoadingMore={false}
          data={historicalNotifications.map<ListRow>(notification => ({
            id: notification.uuid,
            leftSide: {
              label: notification.message.replace(/\n/g, ' '),
              subtitle: getSubtitle([notification.type, notification.recipient, notification.uuid]),
            },
            rightSide: {
              label: new Date(notification.createdAt).toLocaleDateString(),
            },
          }))}
        />

        {specialOrderQuery.isLoading && (
          <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              Loading work order...
            </Text>
          </Stack>
        )}
      </Stack>
    </ScrollView>
  );
}

// TODO: Make the notification selector with auto selection its own modal
// TODO: Change router internals - every component gets 1 screen, and 1 extra whenever they are opened (etc)
