import { useCurrentEmployeeQuery } from '@work-orders/common/queries/use-current-employee-query.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useState } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { useScheduleEventsQuery } from '@work-orders/common/queries/use-schedule-events-query.js';
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Loading } from '@shopify/app-bridge-react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import FullCalendar from '@fullcalendar/react';
import { useScheduleEventQuery } from '@work-orders/common/queries/use-schedule-event-query.js';
import { useScheduleEventTasksQuery } from '@work-orders/common/queries/use-schedule-event-tasks-query.js';
import { useTaskMutation } from '@work-orders/common/queries/use-task-mutation.js';
import { BlockStack, Checkbox, Modal, Text } from '@shopify/polaris';
import { TaskCard } from '@web/frontend/components/tasks/TaskCard.js';

type SelectedItem = { scheduleId: number; eventId: number };

/**
 * Schedule for the current user.
 * Schedule items can be clicked to view details:
 * - name, description, start, end
 * - task list
 * Nothing can be edited here except for tasks (they can be marked as done/not done)
 */
export function YourSchedule() {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const currentEmployeeQuery = useCurrentEmployeeQuery({ fetch });

  const currentEmployee = currentEmployeeQuery.data;

  const [from, setFrom] = useState(new Date(0));
  const [to, setTo] = useState(new Date(0));

  const itemsQuery = useScheduleEventsQuery(
    {
      fetch,
      id: 'all',
      filters: {
        from,
        to,
        published: true,
        staffMemberId: currentEmployee?.id ?? createGid('StaffMember', '0'),
      },
    },
    {
      // Keep previous data to prevent events from disappearing when switching from month->week/day or week->day
      placeholderData: keepPreviousData,
      enabled: !!currentEmployee?.staffMemberId,
    },
  );

  // The selected item will be shown in a modal
  const [selectedItem, setSelectedItem] = useState<SelectedItem>();

  return (
    <>
      {itemsQuery.isFetching && (!itemsQuery.data || !itemsQuery.isPlaceholderData) && <Loading />}

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin]}
        initialView="timeGridDay"
        headerToolbar={{
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        footerToolbar={{
          right: 'today prev,next',
        }}
        nowIndicator
        datesSet={({ start, end }) => {
          setFrom(start);
          setTo(end);
        }}
        eventClick={event => {
          const [scheduleId, eventId] = event.event.id.split('-').map(Number);
          if (scheduleId && eventId) {
            setSelectedItem({ scheduleId, eventId });
          }
        }}
        events={itemsQuery.data?.map(item => ({
          id: `${item.scheduleId}-${item.id}`,
          title: item.name,
          start: item.start,
          end: item.end,
          editable: true,
          color: item.color,
        }))}
      />

      <ScheduleEventInfo selectedItem={selectedItem} setSelectedItem={setSelectedItem} />

      {toast}
    </>
  );
}

/**
 * Modal that displays information about a schedule item.
 */
function ScheduleEventInfo({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem | undefined;
  setSelectedItem: (item: SelectedItem | undefined) => void;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const eventQuery = useScheduleEventQuery({
    fetch,
    scheduleId: selectedItem?.scheduleId ?? null,
    eventId: selectedItem?.eventId ?? null,
  });
  const tasksQuery = useScheduleEventTasksQuery({
    fetch,
    scheduleId: selectedItem?.scheduleId ?? null,
    eventId: selectedItem?.eventId ?? null,
  });

  const tasks = tasksQuery.data ?? [];
  const taskMutation = useTaskMutation({ fetch });

  return (
    <>
      <Modal
        open={!!selectedItem}
        title={eventQuery.data?.name}
        onClose={() => setSelectedItem(undefined)}
        loading={eventQuery.isLoading || tasksQuery.isLoading}
      >
        {taskMutation.isPending && <Loading />}

        <Modal.Section>
          <BlockStack gap={'400'}>
            <BlockStack gap={'050'}>
              <Text as="p" variant="bodyMd" fontWeight="bold">
                Name
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                {eventQuery.data?.name}
              </Text>
            </BlockStack>

            <BlockStack gap={'050'}>
              <Text as="p" variant="bodyMd" fontWeight="bold">
                Description
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                {eventQuery.data?.description}
              </Text>
            </BlockStack>

            <BlockStack gap={'050'}>
              <Text as="p" variant="bodyMd" fontWeight="bold">
                Start
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                {eventQuery.data ? new Date(eventQuery.data.start).toLocaleString() : ''}
              </Text>
            </BlockStack>

            <BlockStack gap={'050'}>
              <Text as="p" variant="bodyMd" fontWeight="bold">
                End
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                {eventQuery.data ? new Date(eventQuery.data.end).toLocaleString() : ''}
              </Text>
            </BlockStack>
          </BlockStack>
        </Modal.Section>
        <Modal.Section>
          <BlockStack gap={'200'}>
            <Text as="p" variant="bodyMd" fontWeight="bold">
              Tasks
            </Text>

            {tasks.length === 0 && (
              <Text as="p" variant="bodyMd" tone="subdued">
                No tasks
              </Text>
            )}

            {tasks.map(task => (
              <TaskCard
                taskId={task.id}
                right={task => (
                  <Checkbox
                    label={'Done'}
                    checked={task.done}
                    onChange={checked =>
                      taskMutation.mutate({
                        id: task.id,
                        name: task.name,
                        description: task.description,
                        estimatedTimeMinutes: task.estimatedTimeMinutes,
                        deadline: task.deadline,
                        done: checked,
                      })
                    }
                  />
                )}
              />
            ))}
          </BlockStack>
        </Modal.Section>
      </Modal>

      {toast}
    </>
  );
}
