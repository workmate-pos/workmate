import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useEmployeeScheduleQuery } from '@work-orders/common/queries/use-employee-schedule-query.js';
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  ColorPicker,
  Divider,
  FormLayout,
  Icon,
  InlineGrid,
  InlineStack,
  Layout,
  Modal,
  Spinner,
  Text,
  TextField,
} from '@shopify/polaris';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { ReactNode, useEffect, useState } from 'react';
import { ChecklistMajor, ChevronLeftMinor, PlusMinor, SearchMinor } from '@shopify/polaris-icons';
import {
  useEmployeeScheduleItemQueries,
  useEmployeeScheduleItemsQuery,
} from '@work-orders/common/queries/use-employee-schedule-items-query.js';
import { keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { useEmployeeAvailabilitiesQuery } from '@work-orders/common/queries/use-employee-availabilities-query.js';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { AVAILABLE_COLOR, UNAVAILABLE_COLOR } from '@web/frontend/components/schedules/YourAvailability.js';
import { StaffMemberSelectorModal } from '@web/frontend/components/selectors/StaffMemberSelectorModal.js';
import { useEmployeeQueries, useEmployeeQuery } from '@work-orders/common/queries/use-employee-query.js';
import { useTasksQuery } from '@work-orders/common/queries/use-tasks-query.js';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { useEmployeeScheduleItemMutation } from '@work-orders/common/queries/use-employee-schedule-item-mutation.js';
import humanizeDuration from 'humanize-duration';
import { YEAR_IN_MS, MINUTE_IN_MS } from '@work-orders/common/time/constants.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { UpdatePublicationStatusModal } from '@web/frontend/components/schedules/modals/UpdatePublicationStatusModal.js';
import { useDeleteEmployeeScheduleItemMutation } from '@work-orders/common/queries/use-delete-employee-schedule-item-mutation.js';
import { Loading } from '@shopify/app-bridge-react';
import { useEmployeeScheduleItemQuery } from '@work-orders/common/queries/use-employee-schedule-item-query.js';
import { DateTimeField } from '@web/frontend/components/form/DateTimeField.js';
import { SearchableChoiceList } from '@web/frontend/components/form/SearchableChoiceList.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import Color from 'color';

const LOAD_DATE = new Date();

export function ManageSchedule({ id, onBack }: { id: number; onBack: () => void }) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  // TODO: Store state in path

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
  const scheduleQuery = useEmployeeScheduleQuery({ fetch, id });
  const scheduleItemsQuery = useEmployeeScheduleItemsQuery(
    { fetch, id, filters: { from, to, staffMemberId } },
    { placeholderData: keepPreviousData },
  );
  const staffMemberQuery = useEmployeeQuery({ fetch, id: staffMemberId ?? null });
  const scheduleItemMutation = useEmployeeScheduleItemMutation({ fetch });
  const deleteScheduleItemMutation = useDeleteEmployeeScheduleItemMutation({ fetch });

  const queryClient = useQueryClient();
  // Need this for Edit/Delete modals
  const isMutatingScheduleItem = !!queryClient.isMutating({ mutationKey: ['employee-schedule-item'] });

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

  const tasks = tasksQuery.data?.flat(1) ?? [];

  const taskItemQueries = useEmployeeScheduleItemQueries({
    fetch,
    options: tasks.map(task => ({
      id: 'all',
      filters: { taskId: task.id, from: LOAD_DATE, to: new Date(LOAD_DATE.getTime() + 10 * YEAR_IN_MS) },
    })),
  });

  const [shouldShowSidebar, setShouldShowSidebar] = useState(true);
  const [shouldShowStaffMemberSelector, setShouldShowStaffMemberSelector] = useState(false);
  const [shouldShowUpdatePublicationStatusModal, setShouldShowUpdatePublicationStatusModal] = useState(false);
  const [shouldShowDeleteScheduleItemModal, setShouldShowDeleteScheduleItemModal] = useState(false);
  const [shouldShowEditScheduleItemModal, setShouldShowEditScheduleItemModal] = useState(false);

  const [itemIdToEdit, setItemIdToEdit] = useState<number>();

  return (
    <Container
      onBack={onBack}
      header={
        !scheduleQuery.isSuccess ? null : (
          <InlineStack gap="200" align="center" blockAlign="end">
            <div onClick={() => setShouldShowUpdatePublicationStatusModal(true)} style={{ cursor: 'pointer' }}>
              {!scheduleQuery.data.publishedAt && <Badge tone="info">Draft</Badge>}
              {scheduleQuery.data.publishedAt &&
                new Date(scheduleQuery.data.publishedAt).getTime() > new Date().getTime() && (
                  <Badge tone="warning">Scheduled</Badge>
                )}
              {scheduleQuery.data.publishedAt &&
                new Date(scheduleQuery.data.publishedAt).getTime() <= new Date().getTime() && (
                  <Badge tone="success">Published</Badge>
                )}
            </div>

            <Text as="h1" variant="headingLg" fontWeight="bold">
              {scheduleQuery.data.name}
            </Text>
          </InlineStack>
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
      {([availabilitiesQuery, scheduleQuery, scheduleItemsQuery].some(query => query.isLoading) ||
        [scheduleItemMutation, deleteScheduleItemMutation].some(mutation => mutation.isPending) ||
        isMutatingScheduleItem) && <Loading />}

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

        {scheduleItemsQuery.isError && (
          <Banner tone="critical" title="Error loading schedule items">
            {extractErrorMessage(scheduleItemsQuery.error, 'An error occurred while loading the schedule items')}
          </Banner>
        )}

        {scheduleItemMutation.isError && (
          <Banner tone="critical" title="Error adding task to schedule">
            {extractErrorMessage(scheduleItemMutation.error, 'An error occurred while adding the task to the schedule')}
          </Banner>
        )}

        {deleteScheduleItemMutation.isError && (
          <Banner tone="critical" title="Error deleting schedule item">
            {extractErrorMessage(
              deleteScheduleItemMutation.error,
              'An error occurred while deleting the schedule item',
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
                  setItemIdToEdit(Number(element.event.id));
                  setShouldShowDeleteScheduleItemModal(true);
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

              ...(scheduleItemsQuery.data?.map(item => {
                // negative id is used for optimistic updates
                const editable = item.id >= 0;
                const colorOpacity = editable ? 'ff' : '77';

                return {
                  id: item.id.toString(),
                  title: item.name,
                  start: item.start,
                  end: item.end,
                  editable,
                  colorOpacity: editable ? 'ff' : '77',
                  color: `${item.color.slice(0, 7)}${colorOpacity}`,
                };
              }) ?? []),
            ]}
            selectable
            select={({ start, end }) => {
              scheduleItemMutation.mutate(
                {
                  itemId: null,
                  scheduleId: id,
                  start,
                  end,
                  staffMemberIds: [staffMemberId].filter(isNonNullable),
                  color: '#a0a0a0',
                  name: 'New event',
                  description: '',
                  taskIds: [],
                },
                {
                  onSuccess(item) {
                    setItemIdToEdit(item.id);
                    setShouldShowEditScheduleItemModal(true);
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
              setItemIdToEdit(Number(event.id));
              setShouldShowEditScheduleItemModal(true);
            }}
            eventChange={({ event }) => {
              const item = scheduleItemsQuery.data?.find(item => item.id.toString() === event.id);

              if (!item) {
                return;
              }

              console.log('did change', item, item.taskIds);

              scheduleItemMutation.mutate({
                scheduleId: id,
                itemId: item.id,
                start: event.start ?? item.start,
                end: event.end ?? item.end,
                staffMemberIds: item.assignedStaffMemberIds,
                color: item.color,
                name: item.name,
                description: item.description,
                taskIds: item.taskIds,
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

                    {tasks.map((task, i) => {
                      const query = taskItemQueries[i];
                      const scheduledTimeMinutes = query?.data
                        ?.map(item => item.end.getTime() - item.start.getTime())
                        .reduce((acc, val) => acc + val / MINUTE_IN_MS, 0);

                      const scheduleEventLengthMinutes = Math.max(
                        30,
                        (task.estimatedTimeMinutes ?? 0) - (scheduledTimeMinutes ?? 0),
                      );
                      const scheduleEventStart = new Date(from.getTime() / 2 + to.getTime() / 2);
                      const scheduleEventEnd = new Date(
                        scheduleEventStart.getTime() + scheduleEventLengthMinutes * MINUTE_IN_MS,
                      );

                      return (
                        <Card>
                          <InlineStack gap="200" align="space-between">
                            <BlockStack gap="050" inlineAlign="start">
                              <InlineStack gap="100">
                                {task.done && <Icon source={ChecklistMajor} tone="success" />}
                                <Text as="p" variant="bodyMd" fontWeight="bold">
                                  {task.name}
                                </Text>
                              </InlineStack>
                              <Text as="p" variant="bodyMd" tone="subdued">
                                {task.description}
                              </Text>
                              {task.estimatedTimeMinutes && (
                                <Text as="p" variant="bodyMd" tone="subdued">
                                  Estimated {humanizeDuration(task.estimatedTimeMinutes * MINUTE_IN_MS)}
                                </Text>
                              )}
                              <Text as="p" variant="bodyMd" tone="subdued">
                                {!!scheduledTimeMinutes
                                  ? `Scheduled ${humanizeDuration(scheduledTimeMinutes * MINUTE_IN_MS)}`
                                  : 'Not scheduled'}
                              </Text>
                            </BlockStack>
                            <Button
                              variant="plain"
                              onClick={() =>
                                scheduleItemMutation.mutate({
                                  scheduleId: id,
                                  itemId: null,
                                  name: task.name,
                                  description: task.description,
                                  staffMemberIds: [staffMemberId].filter(isNonNullable),
                                  start: scheduleEventStart,
                                  end: scheduleEventEnd,
                                  color: '#a0a0a0',
                                  taskIds: [task.id],
                                })
                              }
                            >
                              Add to schedule
                            </Button>
                          </InlineStack>
                        </Card>
                      );
                    })}

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

      <UpdatePublicationStatusModal
        open={shouldShowUpdatePublicationStatusModal}
        onClose={() => setShouldShowUpdatePublicationStatusModal(false)}
        schedules={[scheduleQuery.data].filter(isNonNullable)}
      />

      <DeleteScheduleItemModal
        open={shouldShowDeleteScheduleItemModal}
        onClose={() => setShouldShowDeleteScheduleItemModal(false)}
        scheduleId={id}
        itemId={itemIdToEdit}
      />

      <EditScheduleItemModal
        open={shouldShowEditScheduleItemModal}
        onClose={() => setShouldShowEditScheduleItemModal(false)}
        scheduleId={id}
        itemId={itemIdToEdit}
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
    <BlockStack gap="1000">
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

function DeleteScheduleItemModal({
  open,
  onClose,
  scheduleId,
  itemId,
}: {
  open: boolean;
  onClose: () => void;
  scheduleId: number;
  itemId: number | undefined;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const deleteScheduleItemMutation = useDeleteEmployeeScheduleItemMutation({ fetch });

  return (
    <>
      <Modal
        open={open}
        title={'Delete Schedule Item'}
        onClose={onClose}
        primaryAction={{
          content: 'Delete',
          disabled: !itemId,
          destructive: true,
          onAction: () => {
            if (!itemId) {
              return;
            }

            deleteScheduleItemMutation.mutate({ scheduleId, itemId });
            onClose();
          },
        }}
      >
        <Modal.Section>
          <Text as="p" variant="bodyMd">
            Are you sure you want to delete this schedule item?
          </Text>
        </Modal.Section>
      </Modal>

      {toast}
    </>
  );
}

function EditScheduleItemModal({
  open,
  onClose,
  scheduleId,
  itemId,
}: {
  open: boolean;
  onClose: () => void;
  scheduleId: number;
  itemId: number | undefined;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [staffMemberIds, setStaffMemberIds] = useState<ID[]>([]);
  const [start, setStart] = useState(new Date());
  const [end, setEnd] = useState(new Date());
  // TODO: Store hsv so hue picker works
  const [color, setColor] = useState('#a0a0a0');
  const [taskIds, setTaskIds] = useState<number[]>([]);

  const itemQuery = useEmployeeScheduleItemQuery({ fetch, scheduleId, itemId: itemId ?? null }, { enabled: open });
  const editScheduleItemMutation = useEmployeeScheduleItemMutation({ fetch });

  const staffMemberQueries = useEmployeeQueries({ fetch, ids: staffMemberIds });

  useEffect(() => {
    if (itemQuery.data) {
      setName(itemQuery.data.name);
      setDescription(itemQuery.data.description);
      setStaffMemberIds(itemQuery.data.assignedStaffMemberIds);
      setStart(itemQuery.data.start);
      setEnd(itemQuery.data.end);
      setColor(itemQuery.data.color);
      setTaskIds(itemQuery.data.taskIds);
    }
  }, [itemQuery.data]);

  const [shouldShowStaffMemberSelector, setShouldShowStaffMemberSelector] = useState(false);

  const parsedColor = Color(color);

  return (
    <>
      <Modal
        open={open && !shouldShowStaffMemberSelector}
        title={'Edit Schedule Item'}
        onClose={onClose}
        primaryAction={{
          content: 'Save',
          disabled: !itemId || !name,
          onAction: () => {
            if (!itemId) {
              return;
            }

            editScheduleItemMutation.mutate({
              scheduleId,
              itemId,
              name,
              description,
              staffMemberIds,
              start,
              end,
              color,
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

            <ColorPicker
              color={{
                hue: parsedColor.hue(),
                saturation: parsedColor.saturationv() / 100,
                brightness: parsedColor.value() / 100,
              }}
              onChange={color => {
                setColor(Color.hsv(color.hue, color.saturation * 100, color.brightness * 100).hex());
              }}
            />

            <DateTimeField label="Start" value={start} onChange={start => setStart(start)} requiredIndicator />
            <DateTimeField label="End" value={end} onChange={end => setEnd(end)} requiredIndicator />

            <BlockStack gap="200" inlineAlign="start">
              <SearchableChoiceList
                title="Assigned employees"
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
          </FormLayout>
        </Modal.Section>
      </Modal>

      <StaffMemberSelectorModal
        open={shouldShowStaffMemberSelector}
        onClose={() => setShouldShowStaffMemberSelector(false)}
        onSelect={staffMember => setStaffMemberIds(current => unique([staffMember.id, ...current]))}
      />

      {toast}
    </>
  );
}
