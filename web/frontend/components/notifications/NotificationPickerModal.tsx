import { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { BlockStack, EmptyState, Modal, ResourceItem, ResourceList, Text } from '@shopify/polaris';
import { match, P } from 'ts-pattern';
import { emptyState } from '@web/frontend/assets/index.js';
import { useId } from 'react';
import { UnionToIntersection } from '@teifi-digital/shopify-app-toolbox/types';

type WorkOrderNotification = ShopSettings['workOrder']['notifications'][number];
type SpecialOrderNotification = NonNullable<ShopSettings['specialOrders']['notifications']>[number];

type BaseNotificationPickerModalProps<Notification> = {
  open: boolean;
  onClose: () => void;
  onSelect: (notification: Notification) => void;
  notifications: Notification[];
  loading?: boolean;
};

export type NotificationPickerModalProps =
  | ({ subject: 'work-order' } & BaseNotificationPickerModalProps<WorkOrderNotification>)
  | ({ subject: 'special-order' } & BaseNotificationPickerModalProps<SpecialOrderNotification>);

export function NotificationPickerModal({
  open,
  onClose,
  onSelect,
  notifications,
  loading = false,
  subject,
}: NotificationPickerModalProps) {
  return (
    <Modal open={open} title={'Select Notification'} onClose={onClose} loading={loading}>
      <ResourceList
        items={notifications as UnionToIntersection<(typeof notifications)[number]>[]}
        resourceName={{ singular: 'notification', plural: 'notifications' }}
        emptyState={<EmptyState image={emptyState} heading={'No notifications configured'} />}
        renderItem={notification => (
          <NotificationResourceItem
            subject={subject}
            notification={notification}
            onSelect={() => onSelect(notification as UnionToIntersection<typeof notification>)}
          />
        )}
      />
    </Modal>
  );
}

type NotificationResourceItemProps =
  | {
      subject: 'work-order';
      notification: WorkOrderNotification;
      onSelect: () => void;
    }
  | {
      subject: 'special-order';
      notification: SpecialOrderNotification;
      onSelect: () => void;
    };

function NotificationResourceItem({ subject, notification, onSelect }: NotificationResourceItemProps) {
  if (subject === 'work-order') {
    return <WorkOrderNotificationResourceItem notification={notification} onSelect={onSelect} />;
  }

  if (subject === 'special-order') {
    return <SpecialOrderNotificationResourceItem notification={notification} onSelect={onSelect} />;
  }

  return notification satisfies never;
}

function WorkOrderNotificationResourceItem({
  notification,
  onSelect,
}: Omit<NotificationResourceItemProps & { subject: 'work-order' }, 'subject'>) {
  const id = useId();

  return (
    <ResourceItem id={id} onClick={() => onSelect()}>
      <BlockStack gap={'050'}>
        <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
          {match(notification)
            .with({ type: 'on-status-change', status: P.select() }, status => `Status Changed to ${status}`)
            .with({ type: 'on-create' }, () => 'Work Order Created')
            .exhaustive()}
        </Text>
        <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
          Subject: {notification.email.subject}
        </Text>
        <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
          Email: {notification.email.message}
        </Text>
        <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
          SMS: {notification.sms.message}
        </Text>
      </BlockStack>
    </ResourceItem>
  );
}

function SpecialOrderNotificationResourceItem({
  notification,
  onSelect,
}: Omit<NotificationResourceItemProps & { subject: 'special-order' }, 'subject'>) {
  const id = useId();

  return (
    <ResourceItem id={id} onClick={() => onSelect()}>
      <BlockStack gap={'050'}>
        <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
          {match(notification)
            .with({ type: 'on-any-item-received' }, () => 'Item Received')
            .with({ type: 'on-all-items-received' }, () => 'All Item Received')
            .with({ type: 'on-create' }, () => 'Special Order Created')
            .exhaustive()}
        </Text>
        <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
          Subject: {notification.email.subject}
        </Text>
        <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
          Email: {notification.email.message}
        </Text>
        <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
          SMS: {notification.sms.message}
        </Text>
      </BlockStack>
    </ResourceItem>
  );
}
