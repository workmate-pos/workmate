import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { Route, UseRouter } from '../router.js';
import { TaskInfoProps } from '../tasks/TaskInfo.js';
import { AssignedStaffMemberList, TaskModalProps } from '../tasks/TaskModal.js';
import { useScheduleEventQuery } from '@work-orders/common/queries/use-schedule-event-query.js';
import { useTaskQueries } from '@work-orders/common/queries/use-task-query.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { Banner, ScrollView, Stack, Text } from '@shopify/ui-extensions-react/point-of-sale';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { TaskList } from '../../components/LinkedTasks.js';
import { MultiEmployeeSelectorProps } from '../selector/MultiEmployeeSelector.js';

export type EventInfoProps = {
  scheduleId: number;
  eventId: number;
  useRouter: UseRouter<{
    TaskInfo: Route<TaskInfoProps>;
    TaskModal: Route<TaskModalProps>;
    MultiEmployeeSelector: Route<MultiEmployeeSelectorProps>;
  }>;
};

export function EventInfo({ scheduleId, eventId, useRouter }: EventInfoProps) {
  const router = useRouter();
  const fetch = useAuthenticatedFetch();
  const eventQuery = useScheduleEventQuery({ fetch, scheduleId, eventId });
  const taskIds = eventQuery.data?.taskIds ?? [];
  const taskQueries = useTaskQueries({ fetch, ids: taskIds });

  const screen = useScreen();
  screen.setIsLoading(eventQuery.isLoading || Object.values(taskQueries).some(query => query.isLoading));

  if (eventQuery.isError) {
    return (
      <ScrollView>
        <Banner title="Error loading event" variant="error" action="Retry" onPress={() => eventQuery.refetch()} visible>
          {extractErrorMessage(eventQuery.error, 'An error occurred while loading the event')}
        </Banner>
      </ScrollView>
    );
  }

  if (Object.values(taskQueries).some(query => query.isError)) {
    return (
      <ScrollView>
        <Banner
          title="Error loading tasks"
          variant="error"
          action="Retry"
          onPress={() => Object.values(taskQueries).forEach(query => query.refetch())}
          visible
        >
          {extractErrorMessage(
            Object.values(taskQueries).find(query => query.isError)?.error,
            'An error occurred while loading the tasks',
          )}
        </Banner>
      </ScrollView>
    );
  }

  if (eventQuery.isPending) {
    return (
      <ScrollView>
        <Text color="TextSubdued">Loading...</Text>
      </ScrollView>
    );
  }

  const event = eventQuery.data;
  const tasks = event.taskIds.map(taskId => taskQueries[taskId]?.data).filter(isNonNullable);

  return (
    <ScrollView>
      <Stack direction="vertical" spacing={2}>
        <Text variant="headingLarge">{event.name}</Text>

        <Text variant="body" color="TextSubdued">
          {event.description}
        </Text>

        <AssignedStaffMemberList
          staffMemberIds={event.assignedStaffMemberIds}
          setStaffMemberIds={() => {}}
          useRouter={useRouter}
          editable={false}
        />

        <Text variant="headingSmall">Tasks</Text>

        <TaskList tasks={tasks} useRouter={useRouter} />
      </Stack>
    </ScrollView>
  );
}
