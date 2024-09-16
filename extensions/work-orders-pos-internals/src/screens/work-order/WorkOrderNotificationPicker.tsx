import { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { List, ListRow, ScrollView } from '@shopify/retail-ui-extensions-react';
import { getSubtitle } from '@work-orders/common-pos/util/subtitle.js';
import { useRouter } from '../../routes.js';
import { match, P } from 'ts-pattern';

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
            label: match(notification)
              .with({ type: 'on-status-change', status: P.select() }, status => `Status Changed to ${status}`)
              .with({ type: 'on-create' }, () => 'Work Order Created')
              .exhaustive(),
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
