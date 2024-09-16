import { WorkOrderNotification } from '@web/services/work-orders/types.js';
import { BlockStack, Box, Button, Icon, Tooltip } from '@shopify/polaris';
import { CircleAlertMajor, ReplayMinor, StatusActiveMajor } from '@shopify/polaris-icons';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useReplayNotificationMutation } from '@work-orders/common/queries/use-replay-notification-mutation.js';

export function NotificationStatusIcon({ notification }: { notification: WorkOrderNotification }) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const replayNotificationMutation = useReplayNotificationMutation(
    { fetch },
    {
      onSuccess(replayed) {
        setToastAction({ content: `Replayed notification ${replayed.uuid}` });
      },
    },
  );

  if (notification.replayUuid !== null) {
    return (
      <Tooltip content={`This notification has been replayed (${notification.replayUuid})`}>
        <Icon source={ReplayMinor} tone="magic" />
        {toast}
      </Tooltip>
    );
  }

  if (notification.failed) {
    return (
      <Tooltip content={'This notification failed to send. Click to retry.'}>
        <BlockStack align="center" inlineAlign="center">
          <Button
            variant="plain"
            loading={replayNotificationMutation.isLoading && replayNotificationMutation.variables === notification.uuid}
            icon={<Icon source={CircleAlertMajor} tone="critical" />}
            onClick={() => {
              replayNotificationMutation.mutate(notification.uuid);
            }}
          >
            {''}
          </Button>
        </BlockStack>
        {toast}
      </Tooltip>
    );
  }

  return (
    <Box>
      <Icon source={StatusActiveMajor} tone="success" />
      {toast}
    </Box>
  );
}
