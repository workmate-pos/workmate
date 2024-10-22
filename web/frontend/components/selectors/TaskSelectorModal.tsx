import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import {
  BlockStack,
  Card,
  EmptyState,
  Filters,
  InlineStack,
  Modal,
  ResourceItem,
  ResourceList,
  Text,
} from '@shopify/polaris';
import { useState } from 'react';
import { getInfiniteQueryPagination } from '@web/frontend/util/pagination.js';
import { emptyState } from '@web/frontend/assets/index.js';
import { useTasksQuery } from '@work-orders/common/queries/use-tasks-query.js';
import { TaskPaginationOptions } from '@web/schemas/generated/task-pagination-options.js';
import { Task } from '@web/services/tasks/queries.js';
import humanizeDuration from 'humanize-duration';
import { MINUTE_IN_MS, YEAR_IN_MS } from '@work-orders/common/time/constants.js';
import { useScheduleEventQueries } from '@work-orders/common/queries/use-schedule-events-query.js';

const LOAD_DATE = new Date();

export type TaskSelectorModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (task: Task) => void;
  initialFilters?: Omit<TaskPaginationOptions, 'offset' | 'limit' | 'query'>;
};

export function TaskSelectorModal({ open, onClose, onSelect, initialFilters }: TaskSelectorModalProps) {
  const [query, setQuery, optimisticQuery] = useDebouncedState('');

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  // TODO: Customization
  const [filters, setFilters] = useState<Omit<TaskPaginationOptions, 'offset' | 'limit' | 'query'>>(
    initialFilters ?? {},
  );

  const tasksQuery = useTasksQuery({
    fetch,
    filters: { ...filters, query },
  });

  const [pageIndex, setPageIndex] = useState(0);
  const pagination = getInfiniteQueryPagination(pageIndex, setPageIndex, tasksQuery);
  const page = tasksQuery.data?.pages?.[pageIndex] ?? [];

  // Get events connected to tasks so we can show the total scheduled time
  const taskEventQueries = useScheduleEventQueries({
    fetch,
    options: page.map(task => ({
      id: 'all',
      filters: { taskId: task.id, from: new Date(0), to: new Date(LOAD_DATE.getTime() + 10 * YEAR_IN_MS) },
    })),
  });

  return (
    <>
      <Modal open={open} title={'Select Task'} onClose={onClose}>
        <ResourceList
          items={page}
          resourceName={{ singular: 'task', plural: 'tasks' }}
          loading={tasksQuery.isFetching}
          pagination={{
            hasNext: pagination.hasNextPage,
            hasPrevious: pagination.hasPreviousPage,
            onNext: pagination.next,
            onPrevious: pagination.previous,
          }}
          filterControl={
            <Filters
              queryValue={optimisticQuery}
              queryPlaceholder={'Search tasks'}
              filters={[]}
              onQueryChange={setQuery}
              onQueryClear={() => setQuery('', true)}
              onClearAll={() => setQuery('', true)}
            />
          }
          emptyState={
            <Card>
              <EmptyState heading={'Tasks'} image={emptyState}>
                No tasks found
              </EmptyState>
            </Card>
          }
          renderItem={task => {
            const scheduledTimeMinutes = taskEventQueries[page.indexOf(task)]?.data
              ?.map(event => event.end.getTime() - event.start.getTime())
              .reduce((acc, val) => acc + val / MINUTE_IN_MS, 0);

            return (
              <ResourceItem
                id={task.id.toString()}
                onClick={() => {
                  onSelect(task);
                  onClose();
                }}
              >
                <InlineStack gap="400">
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" fontWeight="bold">
                      {task.name}
                    </Text>

                    <Text as="p" variant="bodyMd" tone="subdued">
                      {task.description}
                    </Text>

                    {!!task.estimatedTimeMinutes && (
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Estimated to take {humanizeDuration(task.estimatedTimeMinutes * MINUTE_IN_MS, {})}
                      </Text>
                    )}

                    <Text as="p" variant="bodyMd" tone="subdued">
                      {!!scheduledTimeMinutes
                        ? `Scheduled ${humanizeDuration(scheduledTimeMinutes * MINUTE_IN_MS)}`
                        : 'Not scheduled'}
                    </Text>
                  </BlockStack>
                </InlineStack>
              </ResourceItem>
            );
          }}
        />
      </Modal>

      {toast}
    </>
  );
}
