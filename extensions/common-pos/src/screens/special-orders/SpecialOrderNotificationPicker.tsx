import { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { List, ListRow, ScrollView } from '@shopify/retail-ui-extensions-react';
import { getSubtitle } from '@work-orders/common-pos/util/subtitle.js';
import { match } from 'ts-pattern';
import { Route, UseRouter } from '../router.js';
import { SpecialOrderNotificationConfigProps } from './SpecialOrderNotificationConfig.js';

type SpecialOrderNotification = NonNullable<ShopSettings['specialOrders']['notifications']>[number];

export type SpecialOrderNotificationPickerProps = {
  name: string | null;
  notifications: SpecialOrderNotification[];
  useRouter: UseRouter<{
    SpecialOrderNotificationConfig: Route<SpecialOrderNotificationConfigProps>;
  }>;
};

export function SpecialOrderNotificationPicker({
  name,
  notifications,
  useRouter,
}: SpecialOrderNotificationPickerProps) {
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
              .with({ type: 'on-create' }, () => 'Special Order Created')
              .with({ type: 'on-any-item-received' }, () => 'Item Received')
              .with({ type: 'on-all-items-received' }, () => 'All Item Received')
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
            router.push('SpecialOrderNotificationConfig', { name, notification, useRouter });
          },
        }))}
      />
    </ScrollView>
  );
}
