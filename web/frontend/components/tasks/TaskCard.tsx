import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { Banner, Bleed, BlockStack, Box, Card, Icon, InlineStack, Spinner, Text } from '@shopify/polaris';
import { DetailedTask, useTaskQuery } from '@work-orders/common/queries/use-task-query.js';
import { useScheduleEventQueries } from '@work-orders/common/queries/use-schedule-events-query.js';
import { DAY_IN_MS, MINUTE_IN_MS, YEAR_IN_MS } from '@work-orders/common/time/constants.js';
import { ChecklistMajor } from '@shopify/polaris-icons';
import humanizeDuration from 'humanize-duration';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { forwardRef, ReactNode, useState } from 'react';
import { TaskModal } from '@web/frontend/components/tasks/TaskModal.js';

const LOAD_DATE = new Date();
const DEADLINE_CRITICAL_THRESHOLD_MS = DAY_IN_MS * 7;

type TaskCardSlot = ReactNode | ((task: DetailedTask) => ReactNode);
const renderTaskCardSlot = (slot: TaskCardSlot, task: DetailedTask) => (typeof slot === 'function' ? slot(task) : slot);

export const TaskCard = forwardRef<
  HTMLSpanElement,
  {
    taskId: number;
    right?: TaskCardSlot;
    content?: TaskCardSlot;
    onClick?: () => void;
    disabled?: boolean;
  }
>(({ taskId, right, content, onClick, disabled }, ref) => {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const taskQuery = useTaskQuery({ fetch, id: taskId });

  if (taskQuery.isError) {
    return (
      <Banner title="Error loading task" tone="critical" action={{ content: 'Retry', onAction: taskQuery.refetch }}>
        {extractErrorMessage(taskQuery.error, 'An error occurred while loading the task')}
        {toast}
      </Banner>
    );
  }

  if (taskQuery.isPending) {
    return (
      <Card>
        <Spinner />
        {toast}
      </Card>
    );
  }

  const task = taskQuery.data;

  return (
    <span
      ref={ref}
      onClick={() => {
        if (!disabled) {
          onClick?.();
        }
      }}
      style={{ cursor: onClick && !disabled ? 'pointer' : 'default' }}
    >
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

            {!!task.deadline && (
              <Text
                as="p"
                variant="bodyMd"
                tone={
                  !task.done && new Date().getTime() + DEADLINE_CRITICAL_THRESHOLD_MS >= task.deadline.getTime()
                    ? 'critical'
                    : 'subdued'
                }
              >
                Due{task.deadline.getTime() > new Date().getTime() ? ' in ' : ' '}
                {humanizeDuration(task.deadline.getTime() - new Date().getTime(), { largest: 2 })}
                {task.deadline.getTime() < new Date().getTime() ? ' ago' : ''}
              </Text>
            )}

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
});

/**
 * Wrapper around {@link TaskCard} that allows you to configure the task card by clicking on it.
 * Opens a modal when clicked.
 */
export const ConfigurableTaskCard = forwardRef<
  HTMLSpanElement,
  {
    taskId: number;
    right?: TaskCardSlot;
    content?: TaskCardSlot;
    onOpenChange?: (open: boolean) => void;
    disabled?: boolean;
    suggestedDeadlines?: Date[];
  }
>(({ taskId, right, content, onOpenChange, disabled, suggestedDeadlines }, ref) => {
  const [shouldShowTaskModal, setShouldShowTaskModal] = useState(false);

  return (
    <>
      <TaskCard
        taskId={taskId}
        right={right}
        content={content}
        ref={ref}
        disabled={disabled}
        onClick={() => {
          setShouldShowTaskModal(true);
          onOpenChange?.(true);
        }}
      />

      <TaskModal
        open={shouldShowTaskModal}
        onClose={() => {
          setShouldShowTaskModal(false);
          onOpenChange?.(false);
        }}
        onSave={() => {}}
        suggestedDeadlines={suggestedDeadlines}
        id={taskId}
      />
    </>
  );
});

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
