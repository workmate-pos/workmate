import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { DetailedTask } from '@work-orders/common/queries/use-task-query.js';
import { useEffect } from 'react';
import { useTasksQuery } from '@work-orders/common/queries/use-tasks-query.js';
import {
  Banner,
  Button,
  Icon,
  List,
  ScrollView,
  Selectable,
  Stack,
  Text,
} from '@shopify/ui-extensions-react/point-of-sale';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { getSubtitle } from '../util/subtitle.js';
import { DAY_IN_MS, MINUTE_IN_MS } from '@work-orders/common/time/constants.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import humanizeDuration from 'humanize-duration';
import { Route, UseRouter } from '../screens/router.js';
import { TaskInfoProps } from '../screens/tasks/TaskInfo.js';
import { MultiEmployeeSelectorProps } from '../screens/selector/MultiEmployeeSelector.js';
import { TaskModalProps } from '../screens/tasks/TaskModal.js';

const DEADLINE_CRITICAL_THRESHOLD_MS = DAY_IN_MS * 7;

// TODO: Components that are compatible with both POS and admin
//  -> Would require router system to have a Modal component for popups
//    -> This is actually pretty nice and would allow for two-way communication
//  -> <Select> would be dropdown on Admin, but popup on POS, etc
//  -> <POS> and <Admin> components that conditionally render to allow for customizable layouts
//    -> A <Switch> component that forces you to provide a component for each platform
//  -> List that allows POS list elements to be components (context to propagate up - somehow check if direct child)
//    -> Maybe accept function with <ListElement> component as only argument

export function LinkedTasks({
  links,
  disabled,
  useRouter,
}: {
  links: Partial<DetailedTask['links']>;
  disabled: boolean;
  useRouter: UseRouter<{
    TaskInfo: Route<TaskInfoProps>;
    MultiEmployeeSelector: Route<MultiEmployeeSelectorProps>;
    TaskModal: Route<TaskModalProps>;
  }>;
}) {
  const router = useRouter();

  const fetch = useAuthenticatedFetch();

  const tasksQuery = useTasksQuery(
    {
      fetch,
      filters: {
        sortMode: 'created-at',
        sortOrder: 'descending',
        links,
      },
    },
    { enabled: Object.values(links).some(values => values.length > 0) },
  );

  useEffect(() => {
    if (tasksQuery.hasNextPage && !tasksQuery.isFetching) {
      tasksQuery.fetchNextPage();
    }
  }, [tasksQuery.isFetching, tasksQuery.hasNextPage]);

  return (
    <ScrollView>
      <ResponsiveStack direction="vertical">
        <ResponsiveStack direction="horizontal" alignment="space-between">
          <Text variant="headingLarge">Tasks</Text>

          <Button
            type="plain"
            title="New Task"
            isDisabled={disabled || !Object.values(links).some(values => values.length > 0)}
            onPress={() =>
              router.push('TaskModal', {
                id: null,
                editable: true,
                onSave: () => {},
                useRouter,
                initial: {
                  links: {
                    workOrders: [],
                    purchaseOrders: [],
                    specialOrders: [],
                    transferOrders: [],
                    cycleCounts: [],
                    serials: [],
                    ...Object.fromEntries(Object.entries(links).filter(([, value]) => value !== undefined)),
                  },
                },
              })
            }
          />
        </ResponsiveStack>
      </ResponsiveStack>

      {tasksQuery.isError && (
        <Banner
          title="Error loading tasks"
          visible
          variant="error"
          action={'Retry'}
          onPress={() => tasksQuery.refetch()}
        >
          {extractErrorMessage(tasksQuery.error, 'An error occurred while loading tasks')}
        </Banner>
      )}

      <Stack direction="vertical" spacing={0.5}>
        {tasksQuery.data?.pages.flat(1).map(task => (
          <Selectable
            key={task.id}
            onPress={() => router.push('TaskModal', { id: task.id, onSave: () => {}, useRouter, editable: true })}
          >
            <Stack
              direction="horizontal"
              spacing={2}
              alignment="space-between"
              paddingVertical={'Small'}
              paddingHorizontal={'Small'}
            >
              <Stack direction="vertical" spacing={0.5}>
                <Text variant="headingSmall" color={'TextNeutral'}>
                  {(task.done ? '✅ ' : '') + task.name}
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

                <Text color={'TextSubdued'}>{task.description}</Text>

                {!!task.estimatedTimeMinutes && (
                  <Text variant="body" color={'TextSubdued'}>
                    Estimated to take {humanizeDuration(task.estimatedTimeMinutes * MINUTE_IN_MS, {})}
                  </Text>
                )}
              </Stack>

              <Icon name="chevron-right" />
            </Stack>
          </Selectable>
        ))}
      </Stack>

      {!tasksQuery.data?.pages.flat(1).length && (
        <Text color="TextSubdued" variant="body">
          No task found
        </Text>
      )}

      {tasksQuery.isFetchingNextPage && <Text color="TextSubdued">Loading...</Text>}
    </ScrollView>
  );
}
