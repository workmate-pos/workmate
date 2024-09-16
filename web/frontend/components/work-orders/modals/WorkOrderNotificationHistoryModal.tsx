import { WorkOrderNotificationModal } from '@web/frontend/components/work-orders/modals/WorkOrderNotificationModal.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useState } from 'react';
import { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { BlockStack, Box, EmptyState, InlineStack, Modal, ResourceItem, ResourceList, Text } from '@shopify/polaris';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';
import { NotificationStatusIcon } from '@web/frontend/components/notifications/NotificationStatusIcon.js';
import { emptyState } from '@web/frontend/assets/index.js';

type WorkOrderNotification = ShopSettings['workOrder']['notifications'][number];

export function WorkOrderNotificationHistoryModal({
  name,
  disabled,
  open,
  onClose,
}: {
  name: string | null;
  disabled: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const workOrderQuery = useWorkOrderQuery({ fetch, name });
  const workOrder = workOrderQuery.data?.workOrder;

  const settingsQuery = useSettingsQuery({ fetch });
  const settings = settingsQuery.data?.settings;

  const allNotifications = settings?.workOrder.notifications ?? [];
  // notifications available for sending
  const [availableNotifications, setAvailableNotifications] = useState<WorkOrderNotification[]>([]);

  return (
    <>
      <Modal
        open={open && availableNotifications.length === 0}
        title={'Notification History'}
        onClose={() => {
          setAvailableNotifications([]);
          onClose();
        }}
        loading={workOrderQuery.isLoading}
        secondaryActions={[
          {
            content: 'Send Notification',
            onAction: () => setAvailableNotifications(allNotifications),
            disabled,
          },
        ]}
      >
        <ResourceList
          items={workOrder?.notifications?.toReversed() ?? []}
          resourceName={{ singular: 'notification', plural: 'notifications' }}
          emptyState={<EmptyState image={emptyState} heading="No notifications sent"></EmptyState>}
          renderItem={(notification, i) => {
            return (
              <ResourceItem id={String(i)} onClick={() => {}}>
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
            );
          }}
        />
      </Modal>

      <WorkOrderNotificationModal
        name={name}
        notifications={availableNotifications}
        setNotifications={setAvailableNotifications}
      />

      {toast}
    </>
  );

  return null;
}
