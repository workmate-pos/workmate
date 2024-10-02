import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { Banner, Bleed, BlockStack, Box, Card, Icon, InlineStack, Text } from '@shopify/polaris';
import { useTaskQuery } from '@work-orders/common/queries/use-task-query.js';
import { useScheduleEventQueries } from '@work-orders/common/queries/use-schedule-events-query.js';
import { MINUTE_IN_MS, YEAR_IN_MS } from '@work-orders/common/time/constants.js';
import { ChecklistMajor } from '@shopify/polaris-icons';
import humanizeDuration from 'humanize-duration';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { forwardRef, ReactNode } from 'react';
import { Task } from '@web/services/tasks/queries.js';

const LOAD_DATE = new Date();

type TaskCardSlot = ReactNode | ((task: Task) => ReactNode);
const renderTaskCardSlot = (slot: TaskCardSlot, task: Task) => (typeof slot === 'function' ? slot(task) : slot);

export const TaskCard = forwardRef<HTMLSpanElement, { taskId: number; right?: TaskCardSlot; content?: TaskCardSlot }>(
  ({ taskId, right, content }, ref) => {
    const [toast, setToastAction] = useToast();
    const fetch = useAuthenticatedFetch({ setToastAction });
    const taskQuery = useTaskQuery({ fetch, id: taskId });

    if (taskQuery.isError) {
      return (
        <Card>
          <Banner title="Error loading task" tone="critical" action={{ content: 'Retry', onAction: taskQuery.refetch }}>
            {extractErrorMessage(taskQuery.error, 'An error occurred while loading the task')}
          </Banner>
          {toast}
        </Card>
      );
    }

    if (taskQuery.isLoading) {
      return <Card>{toast}</Card>;
    }

    if (!taskQuery.data) {
      // Should be impossible?
      return (
        <Card>
          <Text as="p" tone="critical" fontWeight="bold">
            Something went wrong
          </Text>
          {toast}
        </Card>
      );
    }

    const task = taskQuery.data;

    return (
      <span ref={ref}>
        <Card>
          <InlineStack gap={'200'} align="space-between">
            <BlockStack gap={'050'}>
              <InlineStack gap="100" align="start">
                {task.done && (
                  <Bleed marginInlineStart="050">
                    <Box>
                      <Icon source={ChecklistMajor} tone="success" />
                    </Box>
                  </Bleed>
                )}
                <Text as="p" variant="bodyMd" fontWeight="bold">
                  {task.name}
                </Text>
              </InlineStack>

              <Text as="p" variant="bodyMd" tone="subdued">
                {task.description}
              </Text>

              {!!task.estimatedTimeMinutes && (
                <Text as="p" variant="bodyMd" tone="subdued">
                  Estimated to take {humanizeDuration(task.estimatedTimeMinutes * MINUTE_IN_MS, {})}
                </Text>
              )}

              {renderTaskCardSlot(content, task)}
            </BlockStack>

            {renderTaskCardSlot(right, task)}
          </InlineStack>

          {toast}
        </Card>
      </span>
    );
  },
);

export function TaskCardScheduledTimeContent({ taskId }: { taskId: number }) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const eventsQuery = useScheduleEventQueries({
    fetch,
    options: [
      { id: 'all', filters: { taskId, from: new Date(0), to: new Date(LOAD_DATE.getTime() + 10 * YEAR_IN_MS) } },
    ],
  });

  const scheduledTimeMinutes = Object.values(eventsQuery)
    .flatMap(query => query.data ?? [])
    .map(event => event.end.getTime() - event.start.getTime())
    .reduce((acc, val) => acc + val / MINUTE_IN_MS, 0);

  return (
    <>
      <Text as="p" variant="bodyMd" tone="subdued">
        {!!scheduledTimeMinutes
          ? `Scheduled ${humanizeDuration(scheduledTimeMinutes * MINUTE_IN_MS)}`
          : 'Not scheduled'}
      </Text>

      {toast}
    </>
  );
}
