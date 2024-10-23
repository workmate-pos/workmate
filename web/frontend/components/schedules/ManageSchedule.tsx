import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useScheduleQueries, useScheduleQuery } from '@work-orders/common/queries/use-schedule-query.js';
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
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
import { ID, isGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeftMinor, EditMajor, PlusMinor, SearchMinor } from '@shopify/polaris-icons';
import { useScheduleEventsQuery } from '@work-orders/common/queries/use-schedule-events-query.js';
import { keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { useEmployeeAvailabilitiesQuery } from '@work-orders/common/queries/use-employee-availabilities-query.js';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import { AVAILABLE_COLOR, UNAVAILABLE_COLOR } from '@web/frontend/components/schedules/YourAvailability.js';
import { useEmployeeQueries, useEmployeeQuery } from '@work-orders/common/queries/use-employee-query.js';
import { useTasksQuery } from '@work-orders/common/queries/use-tasks-query.js';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { useScheduleEventMutation } from '@work-orders/common/queries/use-schedule-event-mutation.js';
import { useDeleteScheduleEventMutation } from '@work-orders/common/queries/use-delete-schedule-event-mutation.js';
import { Loading } from '@shopify/app-bridge-react';
import { DetailedScheduleEvent, useScheduleEventQuery } from '@work-orders/common/queries/use-schedule-event-query.js';
import { DateTimeField } from '@web/frontend/components/form/DateTimeField.js';
import { SearchableChoiceList } from '@web/frontend/components/form/SearchableChoiceList.js';
import { groupBy, unique, uniqueBy } from '@teifi-digital/shopify-app-toolbox/array';
import Color from 'color';
import { EmployeeAvailability, Schedule } from '@web/services/schedules/queries.js';
import { useScheduleMutation } from '@work-orders/common/queries/use-schedule-mutation.js';
import { ColorField } from '@web/frontend/components/form/ColorField.js';
import { TaskSelectorModal } from '@web/frontend/components/selectors/TaskSelectorModal.js';
import {
  ConfigurableTaskCard,
  TaskCard,
  TaskCardScheduledTimeContent,
} from '@web/frontend/components/tasks/TaskCard.js';
import { useTaskQuery } from '@work-orders/common/queries/use-task-query.js';
import { UseQueryData } from '@work-orders/common/queries/react-query.js';
import { MINUTE_IN_MS } from '@work-orders/common/time/constants.js';
import { MultiStaffMemberSelectorModal } from '@web/frontend/components/selectors/MultiStaffMemberSelectorModal.js';
import { zip } from '@teifi-digital/shopify-app-toolbox/iteration';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { TaskModal } from '@web/frontend/components/tasks/TaskModal.js';

// TODO: Include events from other schedules in the shown availability, with options whether to consider only published or also scheduled and draft
// TODO: Show staff member names in events

const DEFAULT_COLOR_HEX = '#a0a0a0';

export function ManageSchedule({ id, onBack }: { id: number; onBack: () => void }) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const [from, setFrom] = useState<Date>(new Date());
  const [to, setTo] = useState<Date>(new Date());

  // The schedule can be filled for the selected staff member.
  // Their availability is shown, and tasks are shown on the right allowing you to schedule them in.
  // Tasks are shown based on deadline.
  const [staffMemberIds, setStaffMemberIds] = useState<ID[]>([]);

  const [hideStaffMemberAvailability, setHideStaffMemberAvailability] = useState<Record<ID, boolean>>({});
  const [shouldHideFinishedTasks, setShouldHideFinishedTasks] = useState(true);

  const staffMemberQueries = useEmployeeQueries({ fetch, ids: staffMemberIds });

  const [availabilityOptions, setAvailabilityOptions] = useState<
    Record<
      | 'includeEmployeeAvailability'
      | 'includeDraftSchedules'
      | 'includeScheduledSchedules'
      | 'includePublishedSchedules',
      boolean
    >
  >({
    includeEmployeeAvailability: true,
    includeDraftSchedules: false,
    includeScheduledSchedules: true,
    includePublishedSchedules: true,
  });

  const availabilitiesQuery = useEmployeeAvailabilitiesQuery(
    { fetch, filters: { from, to, staffMemberIds } },
    { enabled: !!staffMemberIds.length, placeholderData: !!staffMemberIds.length ? keepPreviousData : [] },
  );
  const scheduleQuery = useScheduleQuery({ fetch, id });
  const scheduleEventsQuery = useScheduleEventsQuery(
    {
      fetch,
      // we need all to include events from other schedules in availability
      id: 'all',
      filters: { from, to, staffMemberIds: staffMemberIds.length ? staffMemberIds : undefined },
    },
    { placeholderData: keepPreviousData },
  );
  const scheduleQueries = useScheduleQueries({
    fetch,
    ids: unique(scheduleEventsQuery.data?.map(event => event.scheduleId) ?? []),
  });

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
        // TODO: Make this match ANY staff member
        // TODO: Maybe an option that will make it exact match?
        // TODO: When adding a task make sure to add the right staff members (assigned AND selected?)
        staffMemberIds,
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

  const staffMemberAvailabilities = useMemo(
    (): StaffMemberAvailability[] =>
      Object.entries(groupBy(availabilitiesQuery.data ?? [], availability => availability.staffMemberId))
        .filter(([staffMemberId]) => !hideStaffMemberAvailability[staffMemberId as ID])
        .flatMap(([staffMemberId, availabilities]) =>
          getStaffMemberAvailability({
            staffMemberId: staffMemberId as ID,
            availabilities: availabilityOptions.includeEmployeeAvailability ? availabilities : [],
            scheduleTypes: (
              [
                availabilityOptions.includeDraftSchedules ? 'draft' : null,
                availabilityOptions.includeScheduledSchedules ? 'scheduled' : null,
                availabilityOptions.includePublishedSchedules ? 'published' : null,
              ] as const
            ).filter(isNonNullable),
            schedules: Object.values(scheduleQueries.data ?? {})
              .filter(isNonNullable)
              .filter(schedule => schedule.id !== id),
            events: scheduleEventsQuery.data ?? [],
          }),
        ),
    [
      availabilitiesQuery.data,
      scheduleQueries.data,
      scheduleEventsQuery.data,
      hideStaffMemberAvailability,
      availabilityOptions,
    ],
  );

  const calendarRef = useRef<FullCalendar>(null);

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
            ref={calendarRef}
            schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, resourceTimeGridPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              right: 'dayGridMonth,timeGridWeek,resourceTimeGridDay',
            }}
            footerToolbar={{
              right: 'today prev,next',
            }}
            eventDidMount={info => {
              // Hide availability depending on the view.
              // Individual staff member availability events are only shown in the resourceTimeGridDay, because there staff members have their own column
              if (
                info.event.display === 'background' &&
                info.event.getResources().some(resource => resource && isGid(resource.id)) &&
                !info.view.type.startsWith('resourceTimeGridDay')
              ) {
                info.el.style.display = 'none';
              }

              info.el.addEventListener('contextmenu', jsEvent => {
                jsEvent.preventDefault();

                if (info.event.id) {
                  setEventIdToEdit(current => current ?? Number(info.event.id));
                  setShouldShowDeleteScheduleEventModal(true);
                }
              });
            }}
            nowIndicator
            datesSet={({ start, end }) => {
              setFrom(start);
              setTo(end);
            }}
            resourceAreaHeaderContent={'Staff members'}
            resourceOrder={undefined}
            resources={[
              ...(calendarRef.current?.getApi().view.type === 'resourceTimeGridDay' && staffMemberIds.length === 1
                ? []
                : [{ id: 'all', title: 'Selected staff members' }]),
              ...staffMemberIds.map(id => ({
                id,
                title: staffMemberQueries[id]?.data?.name ?? 'Unknown staff member',
              })),
            ]}
            events={[
              ...mergeStaffMemberAvailabilities(staffMemberAvailabilities).map(availability => ({
                start: availability.start,
                end: availability.end,
                color: availability.color,
                editable: false,
                display: 'background',
                resourceId: 'all',
              })),

              ...(staffMemberAvailabilities.map(availability => ({
                start: availability.start,
                end: availability.end,
                color: availability.available ? AVAILABLE_COLOR : UNAVAILABLE_COLOR,
                editable: false,
                display: 'background',
                resourceId: availability.staffMemberId,
              })) ?? []),

              ...(scheduleEventsQuery.data
                ?.filter(event => event.scheduleId === id)
                .map(event => {
                  // negative id is used for optimistic updates
                  const editable = event.id >= 0;
                  const colorOpacity = editable ? 'ff' : '77';

                  return {
                    id: event.id.toString(),
                    title: event.name,
                    start: event.start,
                    end: event.end,
                    editable,
                    color: `${event.color.slice(0, 7)}${colorOpacity}`,
                    resourceIds: [
                      ...event.assignedStaffMemberIds,
                      ...(staffMemberIds.every(id => event.assignedStaffMemberIds.includes(id)) ? ['all'] : []),
                    ],
                    extendedProps: {
                      // TODO: Support this
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
            select={({ start, end, resource }) => {
              scheduleEventMutation.mutate(
                {
                  eventId: null,
                  scheduleId: id,
                  start,
                  end,
                  staffMemberIds: !resource || resource.id === 'all' ? staffMemberIds : [resource.id].filter(isGid),
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
            eventChange={info => {
              const event = scheduleEventsQuery.data?.find(event => event.id.toString() === info.event.id);

              if (!event) {
                return;
              }

              const resources = info.event.getResources();
              const assignedStaffMemberIds = resources.some(resource => resource.id === 'all')
                ? staffMemberIds
                : resources.map(resource => resource.id).filter(isGid);

              scheduleEventMutation.mutate({
                scheduleId: id,
                eventId: event.id,
                start: info.event.start ?? event.start,
                end: info.event.end ?? event.end,
                staffMemberIds: assignedStaffMemberIds,
                color: event.color,
                name: event.name,
                description: event.description,
                taskIds: event.taskIds,
              });
            }}
            eventReceive={({ event }) => {
              if (!event.start) {
                return;
              }

              const { taskId, durationMinutes } = event.extendedProps;

              if (typeof taskId !== 'number' || typeof durationMinutes !== 'number') {
                return;
              }

              const task = queryClient.getQueryData<UseQueryData<typeof useTaskQuery>>(['task', taskId]);

              if (!task) {
                return;
              }

              scheduleEventMutation.mutate(
                {
                  scheduleId: id,
                  eventId: null,
                  name: task.name,
                  description: task.description,
                  staffMemberIds: staffMemberIds.filter(staffMemberId => task.staffMemberIds.includes(staffMemberId)),
                  start: event.start,
                  end: new Date(event.start.getTime() + durationMinutes * MINUTE_IN_MS),
                  color: DEFAULT_COLOR_HEX,
                  taskIds: [taskId],
                },
                {
                  onSuccess(event) {
                    setEventIdToEdit(current => current ?? event.id);
                    setShouldShowEditScheduleEventModal(true);
                  },
                },
              );
            }}
          />
        </Layout.Section>
        {shouldShowSidebar && (
          <Layout.Section variant="oneThird">
            <BlockStack gap="200">
              <Card>
                <BlockStack gap="200">
                  <Box paddingBlockEnd="200">
                    <InlineStack gap="200" align="space-between" blockAlign="start">
                      <Text as="h2" variant="headingMd" fontWeight="bold">
                        Staff members
                      </Text>
                      <Button variant="plain" onClick={() => setShouldShowStaffMemberSelector(true)}>
                        Select staff members
                      </Button>
                    </InlineStack>
                  </Box>

                  <Text as="p" variant="bodyMd" tone="subdued">
                    Select staff members to schedule assigned tasks and view combined availability.
                  </Text>

                  {!!staffMemberIds.length && (
                    <>
                      <Box paddingBlock="200">
                        <Divider />
                      </Box>

                      {staffMemberIds.map(id => (
                        <StaffMemberCard
                          id={id}
                          key={id}
                          labelAction={
                            <InlineStack gap="200" blockAlign="center">
                              <Button
                                variant="plain"
                                tone="critical"
                                onClick={() => setStaffMemberIds(current => current.filter(x => x !== id))}
                              >
                                Remove
                              </Button>
                            </InlineStack>
                          }
                          right={
                            <Checkbox
                              label={'Show Availability'}
                              checked={!hideStaffMemberAvailability[id]}
                              onChange={checked =>
                                setHideStaffMemberAvailability(current => ({ ...current, [id]: !checked }))
                              }
                            />
                          }
                        />
                      ))}

                      <Box paddingBlock="200">
                        <Divider />
                      </Box>

                      <Text as="h3" variant="headingMd" fontWeight="bold">
                        Availability
                      </Text>

                      <Text as="p" variant="bodyMd" tone="subdued">
                        Configure which data to include when determining combined availability.
                      </Text>

                      <InlineGrid columns={3} gap={'100'} alignItems="center">
                        {(
                          [
                            ['Employee availability', 'includeEmployeeAvailability'],
                            ['Draft schedules', 'includeDraftSchedules'],
                            ['Scheduled schedules', 'includeScheduledSchedules'],
                            ['Published schedules', 'includePublishedSchedules'],
                          ] as const
                        ).map(([label, key]) => (
                          <InlineStack align="center">
                            <Checkbox
                              label={label}
                              checked={availabilityOptions[key]}
                              onChange={value => setAvailabilityOptions(current => ({ ...current, [key]: value }))}
                            />
                          </InlineStack>
                        ))}
                      </InlineGrid>
                    </>
                  )}
                </BlockStack>
              </Card>

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
                    Tasks can be dragged and dropped to schedule them. They will automatically be associated with the
                    selected assigned staff members.
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

      <MultiStaffMemberSelectorModal
        onClose={() => setShouldShowStaffMemberSelector(false)}
        open={shouldShowStaffMemberSelector}
        selected={staffMemberIds}
        onChange={setStaffMemberIds}
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
  onClose: (deleted: boolean) => void;
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
        onClose={() => onClose(false)}
        primaryAction={{
          content: 'Delete',
          disabled: !eventId,
          destructive: true,
          onAction: () => {
            if (!eventId) {
              return;
            }

            deleteScheduleEventMutation.mutate({ scheduleId, eventId });
            onClose(true);
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
  const [shouldShowDeleteScheduleEventModal, setShouldShowDeleteScheduleEventModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number>();

  return (
    <>
      <Modal
        open={
          open &&
          !shouldShowStaffMemberSelector &&
          !shouldShowTaskSelector &&
          !shouldShowDeleteScheduleEventModal &&
          selectedTaskId === undefined
        }
        title={'Edit Schedule Event'}
        onClose={onClose}
        loading={eventQuery.isLoading}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: onClose,
          },
          {
            content: 'Delete',
            destructive: true,
            disabled: !eventId,
            onAction: () => setShouldShowDeleteScheduleEventModal(true),
          },
        ]}
        primaryAction={{
          content: 'Save',
          disabled: !eventId || !name,
          onAction: () => {
            if (!eventId) {
              return;
            }

            editScheduleEventMutation.mutate({
              scheduleId,
              eventId,
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
                  <BlockStack align="center">
                    <span onClick={event => event.stopPropagation()}>
                      <Button
                        tone="critical"
                        variant="plain"
                        onClick={() => setTaskIds(current => current.filter(x => x !== taskId))}
                      >
                        Remove
                      </Button>
                    </span>
                  </BlockStack>
                }
                onClick={() => setSelectedTaskId(taskId)}
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

      <DeleteScheduleEventModal
        scheduleId={scheduleId}
        eventId={eventId}
        open={shouldShowDeleteScheduleEventModal}
        onClose={deleted => {
          setShouldShowDeleteScheduleEventModal(false);
          if (deleted) {
            onClose();
          }
        }}
      />

      <MultiStaffMemberSelectorModal
        open={shouldShowStaffMemberSelector}
        onClose={() => setShouldShowStaffMemberSelector(false)}
        selected={staffMemberIds}
        onChange={setStaffMemberIds}
      />

      <TaskSelectorModal
        open={shouldShowTaskSelector}
        onClose={() => setShouldShowTaskSelector(false)}
        onSelect={task => setTaskIds(current => [...current.filter(id => id !== task.id), task.id])}
      />

      <TaskModal
        open={selectedTaskId !== undefined}
        onClose={() => setSelectedTaskId(undefined)}
        onSave={() => {}}
        id={selectedTaskId ?? null}
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
      <ConfigurableTaskCard ref={ref} taskId={taskId} content={<TaskCardScheduledTimeContent taskId={taskId} />} />
      {toast}
    </>
  );
}

function StaffMemberCard({ id, labelAction, right }: { id: ID; labelAction?: ReactNode; right?: ReactNode }) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const staffMemberQuery = useEmployeeQuery({ fetch, id });

  if (staffMemberQuery.isError) {
    return (
      <Banner tone="critical" title="Error loading staff member">
        {extractErrorMessage(staffMemberQuery.error, 'An error occurred while loading the staff member')}
      </Banner>
    );
  }

  return (
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

            {labelAction}
          </InlineStack>

          <InlineStack align="space-between" gap="200" blockAlign="end">
            <Text as="p" variant="bodyMd" tone="subdued">
              {staffMemberQuery.data.email}
            </Text>

            {right}
          </InlineStack>
        </BlockStack>
      )}

      {toast}
    </Card>
  );
}

type MergedAvailability = {
  availableStaffMemberIds: ID[];
  unavailableStaffMemberIds: ID[];
  color: string;
  start: Date;
  end: Date;
};

type StaffMemberAvailability = {
  staffMemberId: ID;
  start: Date;
  end: Date;
  available: boolean;
};

/**
 * Get a staff member's availability based on their given availability and scheduled events.
 */
export function getStaffMemberAvailability({
  staffMemberId,
  availabilities,
  schedules,
  events,

  scheduleTypes,
}: {
  staffMemberId: ID;
  availabilities: EmployeeAvailability[];
  events: DetailedScheduleEvent[];
  schedules: Schedule[];

  scheduleTypes: ('draft' | 'scheduled' | 'published')[];
}) {
  schedules = schedules.filter(schedule => scheduleTypes.includes(getScheduleType(schedule)));
  events = events.filter(
    event =>
      event.assignedStaffMemberIds.includes(staffMemberId) &&
      schedules.some(schedule => schedule.id === event.scheduleId),
  );
  availabilities = availabilities.filter(availability => availability.staffMemberId === staffMemberId);

  const sortedDates = sortDates(
    uniqueBy(
      [availabilities, events].flat(1).flatMap(({ start, end }) => [start, end]),
      date => date.getTime(),
    ),
    'ascending',
  );

  const result: StaffMemberAvailability[] = [];

  for (const [start, end] of zip(sortedDates, sortedDates.slice(1))) {
    let available: boolean | null = null;

    // We only need to check for overlap, and not for partial overlap (i.e. one side) or inclusion because we are considering the smallest time ranges.
    // This may introduce subsequent blocks with the same availability, but that is fine as we simply fix that later.
    const timestampOverlaps = (range: { start: Date; end: Date }) =>
      range.start.getTime() <= start.getTime() && range.end.getTime() >= end.getTime();

    for (const availability of availabilities.filter(timestampOverlaps)) {
      available = (available ?? true) && availability.available;
    }

    if (!!events.find(timestampOverlaps)) {
      available = false;
    }

    if (available === null) {
      continue;
    }

    // Merge with the previous time block if it has the same availability.
    // Only has an effect when both availability and events are considered.
    const previousAvailability = result.at(-1);

    if (
      previousAvailability &&
      previousAvailability.available === available &&
      previousAvailability.end.getTime() >= start.getTime()
    ) {
      previousAvailability.end = end;
      continue;
    }

    result.push({
      staffMemberId,
      start,
      end,
      available,
    });
  }

  return result;
}

function getScheduleType(schedule: Schedule) {
  if (!schedule.publishedAt) {
    return 'draft';
  }

  if (schedule.publishedAt.getTime() > new Date().getTime()) {
    return 'scheduled';
  }

  return 'published';
}

/**
 * Merge availabilities of different staff members, allowing you to display combined availability and who is unavailable.
 * The color is automatically computed as a weighted average of `AVAILABLE_COLOR` and `UNAVAILABLE_COLOR`, depending on what % of employees is available.
 */
function mergeStaffMemberAvailabilities(availabilities: StaffMemberAvailability[]) {
  const sortedDates = sortDates(
    uniqueBy(
      availabilities.flatMap(availability => [availability.start, availability.end]),
      date => date.getTime(),
    ),
    'ascending',
  );

  return [...zip(sortedDates, sortedDates.slice(1))].flatMap<MergedAvailability>(([start, end]) => {
    const relevantAvailabilities = availabilities.filter(
      availability => availability.start.getTime() <= start.getTime() && availability.end.getTime() >= end.getTime(),
    );

    if (relevantAvailabilities.length === 0) {
      return [];
    }

    const availableStaffMemberIds = relevantAvailabilities
      .filter(availability => availability.available)
      .map(availability => availability.staffMemberId);

    const unavailableStaffMemberIds = relevantAvailabilities
      .filter(availability => !availability.available)
      .map(availability => availability.staffMemberId);

    const color = Color(AVAILABLE_COLOR)
      .mix(Color(UNAVAILABLE_COLOR), unavailableStaffMemberIds.length / relevantAvailabilities.length)
      .hex();

    return {
      availableStaffMemberIds,
      unavailableStaffMemberIds,
      color,
      start,
      end,
    };
  });
}

function sortDates(dates: Date[], direction: 'ascending' | 'descending') {
  const ascending = (a: Date, b: Date) => a.getTime() - b.getTime();
  const descending = (a: Date, b: Date) => b.getTime() - a.getTime();
  return [...dates].sort(direction === 'ascending' ? ascending : descending);
}
