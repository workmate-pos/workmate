import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useScheduleQuery } from '@work-orders/common/queries/use-schedule-query.js';
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  Divider,
  FormLayout,
  Icon,
  InlineGrid,
  InlineStack,
  Layout,
  Modal,
  Select,
  Spinner,
  Text,
  TextField,
} from '@shopify/polaris';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { ChevronLeftMinor, EditMajor, PlusMinor, SearchMinor } from '@shopify/polaris-icons';
import { useScheduleEventsQuery } from '@work-orders/common/queries/use-schedule-events-query.js';
import { keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { useEmployeeAvailabilitiesQuery } from '@work-orders/common/queries/use-employee-availabilities-query.js';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import { AVAILABLE_COLOR, UNAVAILABLE_COLOR } from '@web/frontend/components/schedules/YourAvailability.js';
import { StaffMemberSelectorModal } from '@web/frontend/components/selectors/StaffMemberSelectorModal.js';
import { useEmployeeQueries, useEmployeeQuery } from '@work-orders/common/queries/use-employee-query.js';
import { useTasksQuery } from '@work-orders/common/queries/use-tasks-query.js';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { useScheduleEventMutation } from '@work-orders/common/queries/use-schedule-event-mutation.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useDeleteScheduleEventMutation } from '@work-orders/common/queries/use-delete-schedule-event-mutation.js';
import { Loading } from '@shopify/app-bridge-react';
import { useScheduleEventQuery } from '@work-orders/common/queries/use-schedule-event-query.js';
import { DateTimeField } from '@web/frontend/components/form/DateTimeField.js';
import { SearchableChoiceList } from '@web/frontend/components/form/SearchableChoiceList.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import Color from 'color';
import { Schedule } from '@web/services/schedules/queries.js';
import { useScheduleMutation } from '@work-orders/common/queries/use-schedule-mutation.js';
import { ColorField } from '@web/frontend/components/form/ColorField.js';
import { TaskSelectorModal } from '@web/frontend/components/selectors/TaskSelectorModal.js';
import { TaskCard, TaskCardScheduledTimeContent } from '@web/frontend/components/tasks/TaskCard.js';
import { useTaskQuery } from '@work-orders/common/queries/use-task-query.js';
import { UseQueryData } from '@work-orders/common/queries/react-query.js';
import { HOUR_IN_MS, MINUTE_IN_MS } from '@work-orders/common/time/constants.js';

const DEFAULT_COLOR_HEX = '#a0a0a0';

export function ManageSchedule({ id, onBack }: { id: number; onBack: () => void }) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const [from, setFrom] = useState<Date>(new Date());
  const [to, setTo] = useState<Date>(new Date());

  // The schedule can be filled for the selected staff member.
  // Their availability is shown, and tasks are shown on the right allowing you to schedule them in.
  // Tasks are shown based on deadline.
  const [staffMemberId, setStaffMemberId] = useState<ID>();

  // If enabled, employee availability is shown
  const [shouldShowAvailability, setShouldShowAvailability] = useState(true);
  const [shouldHideFinishedTasks, setShouldHideFinishedTasks] = useState(true);

  const availabilitiesQuery = useEmployeeAvailabilitiesQuery(
    { fetch, filters: { from, to, staffMemberId: staffMemberId ?? createGid('StaffMember', '0') } },
    { placeholderData: keepPreviousData },
  );
  const scheduleQuery = useScheduleQuery({ fetch, id });
  const scheduleEventsQuery = useScheduleEventsQuery(
    { fetch, id, filters: { from, to, staffMemberId } },
    { placeholderData: keepPreviousData },
  );
  const staffMemberQuery = useEmployeeQuery({ fetch, id: staffMemberId ?? null });
  const scheduleEventMutation = useScheduleEventMutation({ fetch });
  const deleteScheduleEventMutation = useDeleteScheduleEventMutation({ fetch });

  const queryClient = useQueryClient();
  // Need this for Edit/Delete modals
  const isMutatingScheduleEvent = !!queryClient.isMutating({ mutationKey: ['schedule-event'] });
  const isMutatingSchedule = !!queryClient.isMutating({ mutationKey: ['schedule'] });

  const [taskQuery, setTaskQuery, optimisticTaskQuery] = useDebouncedState('');
  const tasksQuery = useTasksQuery(
    {
      fetch,
      filters: {
        query: taskQuery,
        staffMemberId,
        done: shouldHideFinishedTasks ? false : undefined,
        sortMode: 'deadline',
        sortOrder: 'ascending',
      },
    },
    { placeholderData: keepPreviousData },
  );

  const tasks = tasksQuery.data?.pages?.flat(1) ?? [];

  const [shouldShowSidebar, setShouldShowSidebar] = useState(true);
  const [shouldShowStaffMemberSelector, setShouldShowStaffMemberSelector] = useState(false);
  const [shouldShowEditScheduleModal, setShouldShowEditScheduleModal] = useState(false);
  const [shouldShowDeleteScheduleEventModal, setShouldShowDeleteScheduleEventModal] = useState(false);
  const [shouldShowEditScheduleEventModal, setShouldShowEditScheduleEventModal] = useState(false);

  const [eventIdToEdit, setEventIdToEdit] = useState<number>();

  const [hoveringHeader, setHoveringHeader] = useState(false);

  return (
    <Container
      onBack={onBack}
      header={
        !scheduleQuery.isSuccess ? null : (
          <div
            onClick={() => setShouldShowEditScheduleModal(true)}
            onMouseEnter={() => setHoveringHeader(true)}
            onMouseLeave={() => setHoveringHeader(false)}
            style={{ cursor: 'pointer' }}
          >
            <InlineStack gap="200" align="center" blockAlign="end">
              {!scheduleQuery.data.publishedAt && <Badge tone="info">Draft</Badge>}
              {scheduleQuery.data.publishedAt &&
                new Date(scheduleQuery.data.publishedAt).getTime() > new Date().getTime() && (
                  <Badge tone="warning">Scheduled</Badge>
                )}
              {scheduleQuery.data.publishedAt &&
                new Date(scheduleQuery.data.publishedAt).getTime() <= new Date().getTime() && (
                  <Badge tone="success">Published</Badge>
                )}

              <Text as="h1" variant="headingLg" fontWeight="bold">
                {scheduleQuery.data.name}
              </Text>

              <Icon source={EditMajor} tone={hoveringHeader ? 'primary' : 'subdued'} />
            </InlineStack>
          </div>
        )
      }
      actions={
        <InlineStack gap={'200'}>
          <ButtonGroup>
            <Button onClick={() => setShouldShowStaffMemberSelector(true)}>Select Staff Member</Button>
          </ButtonGroup>
        </InlineStack>
      }
    >
      {([availabilitiesQuery, scheduleQuery, scheduleEventsQuery].some(query => query.isLoading) ||
        [scheduleEventMutation, deleteScheduleEventMutation].some(mutation => mutation.isPending) ||
        isMutatingScheduleEvent ||
        isMutatingSchedule) && <Loading />}

      <BlockStack gap={'050'}>
        {availabilitiesQuery.isError && (
          <Banner tone="critical" title="Error loading employee availabilities">
            {extractErrorMessage(
              availabilitiesQuery.error,
              'An error occurred while loading the employee availabilities',
            )}
          </Banner>
        )}

        {scheduleQuery.isError && (
          <Banner tone="critical" title="Error loading schedule">
            {extractErrorMessage(scheduleQuery.error, 'An error occurred while loading the schedule')}
          </Banner>
        )}

        {scheduleEventsQuery.isError && (
          <Banner tone="critical" title="Error loading schedule events">
            {extractErrorMessage(scheduleEventsQuery.error, 'An error occurred while loading the schedule events')}
          </Banner>
        )}

        {scheduleEventMutation.isError && (
          <Banner tone="critical" title="Error adding task to schedule">
            {extractErrorMessage(
              scheduleEventMutation.error,
              'An error occurred while adding the task to the schedule',
            )}
          </Banner>
        )}

        {deleteScheduleEventMutation.isError && (
          <Banner tone="critical" title="Error deleting schedule event">
            {extractErrorMessage(
              deleteScheduleEventMutation.error,
              'An error occurred while deleting the schedule event',
            )}
          </Banner>
        )}
      </BlockStack>

      <Layout>
        <Layout.Section>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            footerToolbar={{
              right: 'today prev,next',
            }}
            eventDidMount={element => {
              element.el.addEventListener('contextmenu', jsEvent => {
                jsEvent.preventDefault();

                if (element.event.id) {
                  setEventIdToEdit(current => current ?? Number(element.event.id));
                  setShouldShowDeleteScheduleEventModal(true);
                }
              });
            }}
            nowIndicator
            datesSet={({ start, end }) => {
              setFrom(start);
              setTo(end);
            }}
            events={[
              ...(shouldShowAvailability
                ? (availabilitiesQuery.data?.map(availability => ({
                    id: availability.id.toString(),
                    title: availability.available ? 'Available' : 'Unavailable',
                    start: availability.start,
                    end: availability.end,
                    color: availability.available ? AVAILABLE_COLOR : UNAVAILABLE_COLOR,
                    editable: false,
                    display: 'background',
                  })) ?? [])
                : []),

              ...(scheduleEventsQuery.data?.map(event => {
                // negative id is used for optimistic updates
                const editable = event.id >= 0;
                const colorOpacity = editable ? 'ff' : '77';

                return {
                  id: event.id.toString(),
                  title: event.name,
                  start: event.start,
                  end: event.end,
                  editable,
                  colorOpacity: editable ? 'ff' : '77',
                  color: `${event.color.slice(0, 7)}${colorOpacity}`,
                  extendedProps: {
                    description: [
                      tasks
                        .filter(task => event.taskIds.includes(task.id))
                        .map(task => task.name)
                        .join(', '),
                    ].join(' • '),
                  },
                };
              }) ?? []),
            ]}
            selectable
            select={({ start, end }) => {
              scheduleEventMutation.mutate(
                {
                  eventId: null,
                  scheduleId: id,
                  start,
                  end,
                  staffMemberIds: [staffMemberId].filter(isNonNullable),
                  color: DEFAULT_COLOR_HEX,
                  name: 'New event',
                  description: '',
                  taskIds: [],
                },
                {
                  onSuccess(event) {
                    setEventIdToEdit(current => current ?? event.id);
                    setShouldShowEditScheduleEventModal(true);
                  },
                },
              );
            }}
            editable
            droppable
            eventResizableFromStart
            eventStartEditable
            eventDurationEditable
            eventClick={({ event }) => {
              setEventIdToEdit(current => current ?? Number(event.id));
              setShouldShowEditScheduleEventModal(true);
            }}
            eventChange={arg => {
              const event = scheduleEventsQuery.data?.find(event => event.id.toString() === arg.event.id);

              if (!event) {
                return;
              }

              scheduleEventMutation.mutate({
                scheduleId: id,
                eventId: event.id,
                start: arg.event.start ?? event.start,
                end: arg.event.end ?? event.end,
                staffMemberIds: event.assignedStaffMemberIds,
                color: event.color,
                name: event.name,
                description: event.description,
                taskIds: event.taskIds,
              });
            }}
            eventReceive={({ event }) => {
              console.log('eventReceive', event);

              if (!event.start) {
                return;
              }

              const { taskId, durationMinutes } = event.extendedProps;

              if (typeof taskId !== 'number' || typeof durationMinutes !== 'number') {
                console.log('taskId or durationMinutes not a number', taskId, durationMinutes);
                return;
              }

              const task = queryClient.getQueryData<UseQueryData<typeof useTaskQuery>>(['task', taskId]);

              if (!task) {
                console.log('task not found');
                return;
              }

              console.log('creating task', task);

              // TODO: Remove event from schedule if not created
              // TODO: Also fix the dragging thing

              scheduleEventMutation.mutate({
                scheduleId: id,
                eventId: null,
                name: task.name,
                description: task.description,
                staffMemberIds: [staffMemberId].filter(isNonNullable),
                start: event.start,
                end: new Date(event.start.getTime() + durationMinutes * MINUTE_IN_MS),
                color: DEFAULT_COLOR_HEX,
                taskIds: [taskId],
              });
            }}
          />
        </Layout.Section>
        {shouldShowSidebar && (
          <Layout.Section variant="oneThird">
            <BlockStack gap="200">
              {staffMemberQuery.isError && (
                <Banner tone="critical" title="Error loading staff member">
                  {extractErrorMessage(staffMemberQuery.error, 'An error occurred while loading the staff member')}
                </Banner>
              )}

              {!!staffMemberId && (
                <Card>
                  {staffMemberQuery.isLoading && <Spinner />}

                  {staffMemberQuery.isSuccess && !staffMemberQuery.data && (
                    <Text as="p" tone="critical" fontWeight="bold">
                      Staff member not found
                    </Text>
                  )}

                  {staffMemberQuery.isSuccess && staffMemberQuery.data && (
                    <BlockStack gap="200">
                      <InlineStack align="space-between" gap="200" blockAlign="center">
                        <Text as="h2" variant="headingMd" fontWeight="bold">
                          {staffMemberQuery.data.name}
                        </Text>

                        <InlineStack gap="200" blockAlign="center">
                          <Button variant="plain" onClick={() => setStaffMemberId(undefined)}>
                            Deselect
                          </Button>
                        </InlineStack>
                      </InlineStack>

                      <InlineStack align="space-between" gap="200" blockAlign="end">
                        <Text as="p" variant="bodyMd" tone="subdued">
                          {staffMemberQuery.data.email}
                        </Text>

                        <Checkbox
                          label={'Show Availability'}
                          checked={shouldShowAvailability}
                          onChange={shouldShowAvailability => setShouldShowAvailability(shouldShowAvailability)}
                        />
                      </InlineStack>
                    </BlockStack>
                  )}
                </Card>
              )}

              <Card>
                <BlockStack gap="200">
                  <Box paddingBlockEnd="200">
                    <InlineStack gap="200" align="space-between" blockAlign="start">
                      <Text as="h2" variant="headingMd" fontWeight="bold">
                        Tasks
                      </Text>
                      <Checkbox
                        label={'Hide finished tasks'}
                        checked={shouldHideFinishedTasks}
                        onChange={shouldHideFinishedTasks => setShouldHideFinishedTasks(shouldHideFinishedTasks)}
                      />
                    </InlineStack>
                  </Box>

                  <Text as="p" variant="bodyMd" tone="subdued">
                    Tasks can be dragged and dropped to schedule them. They will automatically be associated with their
                    assigned employee.
                  </Text>

                  <Box paddingBlock="200">
                    <Divider />
                  </Box>

                  {tasksQuery.isError && (
                    <Banner tone="critical" title="Error loading tasks">
                      {extractErrorMessage(tasksQuery.error, 'An error occurred while loading the tasks')}
                    </Banner>
                  )}

                  <BlockStack gap="400">
                    <TextField
                      label={'Search'}
                      labelHidden
                      autoComplete="off"
                      value={optimisticTaskQuery}
                      onChange={query => setTaskQuery(query, !query)}
                      size="slim"
                      placeholder={`Search tasks`}
                      clearButton
                      onClearButtonClick={() => setTaskQuery('')}
                      prefix={<Icon source={SearchMinor} tone="base" />}
                      loading={tasksQuery.isFetching}
                    />

                    {tasks.map(task => (
                      <DraggableTaskCard taskId={task.id} />
                    ))}

                    {tasks.length === 0 && (
                      <Text as="p" variant="bodyMd" tone="subdued">
                        No tasks found
                      </Text>
                    )}
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        )}
      </Layout>

      <StaffMemberSelectorModal
        onClose={() => setShouldShowStaffMemberSelector(false)}
        open={shouldShowStaffMemberSelector}
        onSelect={staffMember => setStaffMemberId(staffMember.id)}
      />

      <EditScheduleModal
        open={shouldShowEditScheduleModal}
        onClose={() => setShouldShowEditScheduleModal(false)}
        schedule={scheduleQuery.data}
      />

      <DeleteScheduleEventModal
        open={shouldShowDeleteScheduleEventModal}
        onClose={() => {
          setEventIdToEdit(undefined);
          setShouldShowDeleteScheduleEventModal(false);
        }}
        scheduleId={id}
        eventId={eventIdToEdit}
      />

      <EditScheduleEventModal
        open={shouldShowEditScheduleEventModal}
        onClose={() => {
          setEventIdToEdit(undefined);
          setShouldShowEditScheduleEventModal(false);
        }}
        scheduleId={id}
        eventId={eventIdToEdit}
      />

      {toast}
    </Container>
  );
}

function Container({
  children,
  header,
  onBack,
  actions,
}: {
  children: ReactNode;
  header: ReactNode;
  onBack: () => void;
  actions?: ReactNode;
}) {
  return (
    <BlockStack gap="200">
      <InlineGrid columns={3} alignItems="center" gap="200">
        <InlineStack align="start" blockAlign="center">
          <Button variant="plain" icon={ChevronLeftMinor} onClick={() => onBack()}>
            Back
          </Button>
        </InlineStack>

        <InlineStack align="center" blockAlign="center">
          {header}
        </InlineStack>

        <InlineStack align="end" blockAlign="center">
          {actions}
        </InlineStack>
      </InlineGrid>

      {children}
    </BlockStack>
  );
}

function DeleteScheduleEventModal({
  open,
  onClose,
  scheduleId,
  eventId,
}: {
  open: boolean;
  onClose: () => void;
  scheduleId: number;
  eventId: number | undefined;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const deleteScheduleEventMutation = useDeleteScheduleEventMutation({ fetch });

  return (
    <>
      <Modal
        open={open}
        title={'Delete Schedule Event'}
        onClose={onClose}
        primaryAction={{
          content: 'Delete',
          disabled: !eventId,
          destructive: true,
          onAction: () => {
            if (!eventId) {
              return;
            }

            deleteScheduleEventMutation.mutate({ scheduleId, eventId });
            onClose();
          },
        }}
      >
        <Modal.Section>
          <Text as="p" variant="bodyMd">
            Are you sure you want to delete this event?
          </Text>
        </Modal.Section>
      </Modal>

      {toast}
    </>
  );
}

function EditScheduleEventModal({
  open,
  onClose,
  scheduleId,
  eventId,
}: {
  open: boolean;
  onClose: () => void;
  scheduleId: number;
  eventId: number | undefined;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [staffMemberIds, setStaffMemberIds] = useState<ID[]>([]);
  const [start, setStart] = useState(new Date());
  const [end, setEnd] = useState(new Date());
  const [color, setColor] = useState(Color(DEFAULT_COLOR_HEX));
  const [taskIds, setTaskIds] = useState<number[]>([]);

  const eventQuery = useScheduleEventQuery({ fetch, scheduleId, eventId: eventId ?? null }, { enabled: open });
  const editScheduleEventMutation = useScheduleEventMutation({ fetch });

  const staffMemberQueries = useEmployeeQueries({ fetch, ids: staffMemberIds });

  useEffect(() => {
    if (eventQuery.data) {
      setName(eventQuery.data.name);
      setDescription(eventQuery.data.description);
      setStaffMemberIds(eventQuery.data.assignedStaffMemberIds);
      setStart(eventQuery.data.start);
      setEnd(eventQuery.data.end);
      setColor(Color(eventQuery.data.color));
      setTaskIds(eventQuery.data.taskIds);
    }
  }, [eventQuery.data]);

  const [shouldShowStaffMemberSelector, setShouldShowStaffMemberSelector] = useState(false);
  const [shouldShowTaskSelector, setShouldShowTaskSelector] = useState(false);

  return (
    <>
      <Modal
        open={open && !shouldShowStaffMemberSelector && !shouldShowTaskSelector}
        title={'Edit Schedule Event'}
        onClose={onClose}
        loading={eventQuery.isLoading}
        primaryAction={{
          content: 'Save',
          disabled: !eventId || !name,
          onAction: () => {
            if (!eventId) {
              return;
            }

            editScheduleEventMutation.mutate({
              scheduleId,
              eventId: eventId,
              name,
              description,
              staffMemberIds,
              start,
              end,
              color: color.hex(),
              taskIds,
            });
            onClose();
          },
        }}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label={'Name'}
              autoComplete="off"
              value={name}
              onChange={name => setName(name)}
              requiredIndicator
            />
            <TextField
              label={'Description'}
              autoComplete="off"
              multiline
              value={description}
              onChange={description => setDescription(description)}
            />

            <ColorField color={color} setColor={setColor} />

            <DateTimeField label="Start" value={start} onChange={start => setStart(start)} requiredIndicator />
            <DateTimeField label="End" value={end} onChange={end => setEnd(end)} requiredIndicator />
          </FormLayout>
        </Modal.Section>

        <Modal.Section>
          <BlockStack gap="200" inlineAlign="start">
            <SearchableChoiceList
              title="Assigned staff members"
              choices={staffMemberIds.map(id => {
                const query = staffMemberQueries[id]?.data;
                return {
                  value: id,
                  label: query?.name ?? 'Unknown employee',
                  helpText: query?.email,
                };
              })}
              selected={staffMemberIds}
              onChange={staffMemberIds => setStaffMemberIds(staffMemberIds as ID[])}
              searchable={false}
              resourceName={{ singular: 'staff member', plural: 'staff members' }}
            />
            <Button variant="plain" icon={PlusMinor} onClick={() => setShouldShowStaffMemberSelector(true)}>
              Add staff member
            </Button>
          </BlockStack>
        </Modal.Section>

        <Modal.Section>
          <BlockStack gap={'200'}>
            <Text as="p" variant="headingMd" fontWeight="bold">
              Tasks
            </Text>

            {taskIds.length === 0 && (
              <Text as="p" variant="bodyMd" tone="subdued">
                No tasks
              </Text>
            )}

            {taskIds.map(taskId => (
              <TaskCard
                taskId={taskId}
                content={<TaskCardScheduledTimeContent taskId={taskId} />}
                right={
                  <Button
                    tone="critical"
                    variant="plain"
                    onClick={() => setTaskIds(current => current.filter(x => x !== taskId))}
                  >
                    Remove
                  </Button>
                }
              />
            ))}

            <Box paddingBlockStart={'200'}>
              <Button variant="plain" icon={PlusMinor} onClick={() => setShouldShowTaskSelector(true)}>
                Add task
              </Button>
            </Box>
          </BlockStack>
        </Modal.Section>
      </Modal>

      <StaffMemberSelectorModal
        open={shouldShowStaffMemberSelector}
        onClose={() => setShouldShowStaffMemberSelector(false)}
        onSelect={staffMember => setStaffMemberIds(current => unique([staffMember.id, ...current]))}
      />

      <TaskSelectorModal
        open={shouldShowTaskSelector}
        onClose={() => setShouldShowTaskSelector(false)}
        onSelect={task => setTaskIds(current => [...current.filter(id => id !== task.id), task.id])}
      />

      {toast}
    </>
  );
}

export function EditScheduleModal({
  open,
  onClose,
  schedule,
}: {
  open: boolean;
  onClose: () => void;
  schedule: Schedule | undefined;
}) {
  const [name, setName] = useState('');
  const [locationId, setLocationId] = useState<ID>();
  const [publicationStatus, setPublicationStatus] = useState<string>();
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date());

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const scheduleMutation = useScheduleMutation({ fetch });

  useEffect(() => {
    if (schedule) {
      setName(schedule.name);
      setLocationId(schedule.locationId ?? undefined);

      if (!schedule.publishedAt) {
        setPublicationStatus('draft');
      } else if (schedule.publishedAt.getTime() > new Date().getTime()) {
        setPublicationStatus('scheduled');
        setScheduledDate(new Date(schedule.publishedAt));
      } else {
        setPublicationStatus('published');
      }
    }
  }, [schedule]);

  return (
    <>
      <Modal
        open={open}
        title={'Edit Schedule'}
        onClose={onClose}
        primaryAction={{
          content: 'Update schedule',
          disabled: !schedule || !name,
          onAction: () => {
            if (!schedule) {
              return;
            }

            let publishedAt: Date | null = null;

            if (publicationStatus === 'scheduled') {
              publishedAt = scheduledDate;
            } else if (publicationStatus === 'published') {
              publishedAt = new Date();
            }

            scheduleMutation.mutate({
              id: schedule.id,
              locationId: locationId ?? null,
              publishedAt,
              name,
            });

            onClose();
          },
        }}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label={'Name'}
              autoComplete="off"
              value={name}
              onChange={name => setName(name)}
              requiredIndicator
            />

            <Select
              label={'Publication Status'}
              options={[
                {
                  label: 'Draft',
                  value: 'draft',
                },
                {
                  label: 'Scheduled',
                  value: 'scheduled',
                },
                {
                  label: 'Published',
                  value: 'published',
                },
              ]}
              onChange={setPublicationStatus}
              value={publicationStatus}
            />

            {publicationStatus === 'scheduled' && (
              <DateTimeField
                label="Publication Date & Time"
                value={scheduledDate}
                onChange={setScheduledDate}
                min={new Date()}
              />
            )}
          </FormLayout>
        </Modal.Section>
      </Modal>

      {toast}
    </>
  );
}

// TaskCard that can be dragged to the schedule to create a new event
function DraggableTaskCard({ taskId }: { taskId: number }) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const taskQuery = useTaskQuery({ fetch, id: taskId });

  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const durationMinutes = 60;

    const draggable = new Draggable(ref.current, {
      eventData: {
        create: true,

        // Preview
        color: DEFAULT_COLOR_HEX,
        duration: { minutes: durationMinutes },
        title: taskQuery.data?.name,

        // Used to create a new event
        taskId,
        durationMinutes,
      },
    });
    return () => draggable.destroy();
  });

  return (
    <>
      <TaskCard ref={ref} taskId={taskId} content={<TaskCardScheduledTimeContent taskId={taskId} />} />
      {toast}
    </>
  );
}
