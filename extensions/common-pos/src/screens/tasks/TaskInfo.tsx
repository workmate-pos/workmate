import { Banner, Button, ScrollView, Stack, Text } from '@shopify/ui-extensions-react/point-of-sale';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useTaskQuery } from '@work-orders/common/queries/use-task-query.js';
import humanizeDuration from 'humanize-duration';
import { DAY_IN_MS, MINUTE_IN_MS, YEAR_IN_MS } from '@work-orders/common/time/constants.js';
import { useScheduleEventQueries } from '@work-orders/common/queries/use-schedule-events-query.js';
import { Route, UseRouter } from '../router.js';
import { TaskModalProps } from './TaskModal.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { MultiEmployeeSelectorProps } from '../selector/MultiEmployeeSelector.js';

const LOAD_DATE = new Date();
const DEADLINE_CRITICAL_THRESHOLD_MS = DAY_IN_MS * 7;

export type TaskInfoProps = {
  id: number;
  editable?: boolean;
  useRouter: UseRouter<{
    TaskModal: Route<TaskModalProps>;
    MultiEmployeeSelector: Route<MultiEmployeeSelectorProps>;
  }>;
};

/**
 * Equivalent of TaskCard in admin.
 */
export function TaskInfo({ id, useRouter, editable }: TaskInfoProps) {
  const router = useRouter();

  const fetch = useAuthenticatedFetch();

  const taskQuery = useTaskQuery({ fetch, id });
  const eventsQuery = useScheduleEventQueries({
    fetch,
    options: [
      { id: 'all', filters: { taskId: id, from: new Date(0), to: new Date(LOAD_DATE.getTime() + 10 * YEAR_IN_MS) } },
    ],
  });

  const scheduledTimeMinutes = Object.values(eventsQuery)
    .flatMap(query => query.data ?? [])
    .map(event => event.end.getTime() - event.start.getTime())
    .reduce((acc, val) => acc + val / MINUTE_IN_MS, 0);

  const screen = useScreen();
  screen.setIsLoading(taskQuery.isLoading);

  if (taskQuery.isError) {
    return (
      <ScrollView>
        <Banner title="Error loading task" variant="error" action="Retry" onPress={() => taskQuery.refetch()} visible>
          {extractErrorMessage(taskQuery.error, 'An error occurred while loading the task')}
        </Banner>
      </ScrollView>
    );
  }

  if (taskQuery.isPending) {
    return (
      <ScrollView>
        <Text color="TextSubdued">Loading...</Text>
      </ScrollView>
    );
  }

  const task = taskQuery.data;

  return (
    <ScrollView>
      <Stack direction="vertical" spacing={2}>
        <Text variant="headingLarge">
          {task.done ? '✅ ' : ''}
          {task.name}
        </Text>

        {!!task.deadline && (
          <Text
            variant="body"
            color={
              !task.done && new Date().getTime() + DEADLINE_CRITICAL_THRESHOLD_MS >= task.deadline.getTime()
                ? 'TextCritical'
                : 'TextSubdued'
            }
          >
            Due{task.deadline.getTime() > new Date().getTime() ? ' in ' : ' '}
            {humanizeDuration(task.deadline.getTime() - new Date().getTime(), { largest: 2 })}
            {task.deadline.getTime() < new Date().getTime() ? ' ago' : ''}
          </Text>
        )}

        <Text variant="body" color="TextSubdued">
          {task.description}
        </Text>

        {!!task.estimatedTimeMinutes && (
          <Text variant="body" color="TextSubdued">
            Estimated to take {humanizeDuration(task.estimatedTimeMinutes * MINUTE_IN_MS, {})}
          </Text>
        )}

        <Text>
          {!!scheduledTimeMinutes
            ? `Scheduled ${humanizeDuration(scheduledTimeMinutes * MINUTE_IN_MS)}`
            : 'Not scheduled'}
        </Text>

        {editable && (
          <Button
            title="Edit"
            onPress={() => router.push('TaskModal', { id, useRouter, onSave: () => {}, editable: true })}
          ></Button>
        )}
      </Stack>
    </ScrollView>
  );
}
