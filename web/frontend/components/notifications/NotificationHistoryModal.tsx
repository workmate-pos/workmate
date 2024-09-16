import { DetailedWorkOrder } from '@web/services/work-orders/types.js';
import { DetailedSpecialOrder } from '@web/services/special-orders/types.js';
import { BlockStack, Box, EmptyState, InlineStack, Modal, ResourceItem, ResourceList, Text } from '@shopify/polaris';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useMemo } from 'react';
import { emptyState } from '@web/frontend/assets/index.js';
import { NotificationStatusIcon } from '@web/frontend/components/notifications/NotificationStatusIcon.js';

type BaseNotificationHistoryModalProps<Notification> = {
  disabled: boolean;
  open: boolean;
  onClose: () => void;
  notifications: Notification[];
  onSendNotification: () => void;
};

type HistoricalWorkOrderNotification = DetailedWorkOrder['notifications'][number];
type HistoricalSpecialOrderNotification = DetailedSpecialOrder['notifications'][number];

export type NotificationHistoryModalProps =
  | ({
      subject: 'work-order';
    } & BaseNotificationHistoryModalProps<HistoricalWorkOrderNotification>)
  | ({
      subject: 'special-order';
    } & BaseNotificationHistoryModalProps<HistoricalSpecialOrderNotification>);

export function NotificationHistoryModal({
  subject,
  notifications,
  disabled,
  open,
  onClose,
  onSendNotification,
}: NotificationHistoryModalProps) {
  // sort from newest to oldest = descending
  const sortedNotifications = useMemo(
    () => notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notifications],
  );

  return (
    <Modal
      open={open}
      title={'Notification History'}
      onClose={onClose}
      secondaryActions={[
        !!onSendNotification
          ? {
              content: 'Send Notification',
              onAction: onSendNotification,
              disabled,
            }
          : null,
      ].filter(isNonNullable)}
    >
      <ResourceList
        items={sortedNotifications}
        resourceName={{ singular: 'notification', plural: 'notifications' }}
        emptyState={<EmptyState image={emptyState} heading="No notifications sent"></EmptyState>}
        renderItem={notification => (
          <ResourceItem id={notification.uuid} onClick={() => {}}>
            <BlockStack gap={'050'}>
              <InlineStack gap="100">
                <NotificationStatusIcon notification={notification} />
                <Text as="p" variant="bodyMd" fontWeight="bold">
                  {notification.message}
                </Text>
              </InlineStack>
              <Text as="p" variant="bodyMd" tone="subdued">
                {notification.type}
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                {notification.recipient}
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                {new Date(notification.createdAt).toLocaleDateString()}
              </Text>
              <Box paddingBlock={'100'}>
                <Text as="p" variant="bodyXs" tone="subdued">
                  {notification.uuid}
                </Text>
              </Box>
            </BlockStack>
          </ResourceItem>
        )}
      />
    </Modal>
  );
}
