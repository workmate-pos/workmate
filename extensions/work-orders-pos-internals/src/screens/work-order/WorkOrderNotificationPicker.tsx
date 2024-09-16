import { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { List, ListRow, ScrollView } from '@shopify/retail-ui-extensions-react';
import { getSubtitle } from '@work-orders/common-pos/util/subtitle.js';
import { useRouter } from '../../routes.js';

type WorkOrderNotification = ShopSettings['workOrder']['notifications'][number];

export function WorkOrderNotificationPicker({
  name,
  notifications,
}: {
  name: string | null;
  notifications: WorkOrderNotification[];
}) {
  const router = useRouter();

  return (
    <ScrollView>
      <List
        imageDisplayStrategy={'never'}
        isLoadingMore={false}
        data={notifications.map<ListRow>((notification, i) => ({
          id: String(i),
          leftSide: {
            label: notification.status,
            subtitle: getSubtitle([
              `Subject: ${notification.email.subject}`,
              `Email: ${notification.email.message}`,
              `SMS: ${notification.sms.message}`,
            ]),
          },
          rightSide: {
            showChevron: true,
          },
          onPress: async () => {
            // TODO: Make this just slide
            await router.popCurrent();
            router.push('WorkOrderNotificationConfig', { name, notification });
          },
        }))}
      />
    </ScrollView>
  );
}
