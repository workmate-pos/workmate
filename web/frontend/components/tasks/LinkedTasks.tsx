import { Banner, BlockStack, Button, ButtonProps, InlineStack, Spinner, Text } from '@shopify/polaris';
import { useTasksQuery } from '@work-orders/common/queries/use-tasks-query.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { ReactNode, useEffect, useState } from 'react';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { ConfigurableTaskCard, TaskCardScheduledTimeContent } from '@web/frontend/components/tasks/TaskCard.js';
import { PlusMinor } from '@shopify/polaris-icons';
import { TaskModal } from '@web/frontend/components/tasks/TaskModal.js';
import { DetailedTask } from '@work-orders/common/queries/use-task-query.js';

export function LinkedTasks({
  links,
  action,
  disabled,
}: {
  links: Partial<DetailedTask['links']>;
  disabled: boolean;
  action?: ReactNode;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

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
    <BlockStack gap={'400'}>
      <InlineStack align={'space-between'}>
        <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
          Tasks
        </Text>

        {action}
      </InlineStack>

      {tasksQuery.isError && (
        <Banner
          title="Error loading tasks"
          tone="critical"
          action={{
            content: 'Retry',
            onAction: tasksQuery.refetch,
          }}
        >
          {extractErrorMessage(tasksQuery.error, 'An error occurred while loading tasks')}
        </Banner>
      )}

      {!tasksQuery.data?.pages.flat(1).length && (
        <Text as="p" variant="bodyMd" tone="subdued">
          No tasks found
        </Text>
      )}

      {tasksQuery.data?.pages
        .flat(1)
        .map(task => (
          <ConfigurableTaskCard
            disabled={disabled}
            key={task.id}
            taskId={task.id}
            content={<TaskCardScheduledTimeContent taskId={task.id} />}
          />
        ))}

      {tasksQuery.isFetchingNextPage && <Spinner />}

      {toast}
    </BlockStack>
  );
}

export function NewTaskButton(props: Omit<ButtonProps, 'variant' | 'icon'>) {
  return (
    <Button icon={PlusMinor} variant={'plain'} {...props}>
      New Task
    </Button>
  );
}

export function NewLinkedTaskButton({ links }: { links: Partial<DetailedTask['links']> }) {
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  return (
    <>
      <NewTaskButton onClick={() => setIsCreatingTask(true)}>New Task</NewTaskButton>
      <TaskModal
        open={isCreatingTask}
        onClose={() => setIsCreatingTask(false)}
        onSave={() => {}}
        id={null}
        initial={{
          links: {
            workOrders: [],
            purchaseOrders: [],
            specialOrders: [],
            transferOrders: [],
            cycleCounts: [],
            serials: [],
            // stoopid ts
            ...Object.fromEntries(Object.entries(links).filter(([, value]) => value !== undefined)),
          },
        }}
      />
    </>
  );
}
