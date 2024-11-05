import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { DetailedTask, useTaskQuery } from '@work-orders/common/queries/use-task-query.js';
import {
  Banner,
  BlockStack,
  Button,
  Card,
  Checkbox,
  FormLayout,
  InlineStack,
  Modal,
  Spinner,
  Text,
  TextField,
} from '@shopify/polaris';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useEffect, useState } from 'react';
import { useTaskMutation } from '@work-orders/common/queries/use-task-mutation.js';
import { DateTimeField } from '@web/frontend/components/form/DateTimeField.js';
import { SearchableChoiceList } from '@web/frontend/components/form/SearchableChoiceList.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { PlusMinor } from '@shopify/polaris-icons';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { MultiStaffMemberSelectorModal } from '@web/frontend/components/selectors/MultiStaffMemberSelectorModal.js';
import { useScheduleEventsQuery } from '@work-orders/common/queries/use-schedule-events-query.js';
import { YEAR_IN_MS } from '@work-orders/common/time/constants.js';
import humanizeDuration from 'humanize-duration';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useScheduleEventQuery } from '@work-orders/common/queries/use-schedule-event-query.js';
import { Task } from '@web/services/tasks/queries.js';

const LOAD_DATE = new Date();

// TODO: Task card in work orders that uses taskcard with a new task button
// TODO: Creating links + ability to hide it

export function TaskModal({
  open,
  onClose,
  id,
  editable = true,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  editable?: boolean;
  id: number | null;

  /**
   * Initial values used when id is null.
   */
  initial?: {
    name?: string;
    description?: string;
    estimatedTimeMinutes?: number;
    deadline?: Date;
    done?: boolean;
    staffMemberIds?: ID[];
    links?: DetailedTask['links'];
  };
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const taskQuery = useTaskQuery({ fetch, id });
  const taskMutation = useTaskMutation(
    { fetch },
    {
      onSuccess: task => {
        setToastAction({ content: 'Saved task' });
        onSave(task);
      },
    },
  );

  const title = ['Task', taskQuery.data?.name].filter(Boolean).join(' - ');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState<Date>();
  const [done, setDone] = useState(false);
  const [estimatedTimeMinutes, setEstimatedTimeMinutes] = useState<number>();
  const [staffMemberIds, setStaffMemberIds] = useState<ID[]>([]);
  // TODO: Display
  const [links, setLinks] = useState<DetailedTask['links']>({
    workOrders: [],
    purchaseOrders: [],
    specialOrders: [],
    transferOrders: [],
    cycleCounts: [],
    serials: [],
  });

  useEffect(() => {
    if (taskQuery.data) {
      setName(taskQuery.data.name);
      setDescription(taskQuery.data.description);
      setDeadline(taskQuery.data.deadline ?? undefined);
      setDone(taskQuery.data.done);
      setEstimatedTimeMinutes(taskQuery.data.estimatedTimeMinutes ?? undefined);
      setStaffMemberIds(taskQuery.data.staffMemberIds);
      setLinks(taskQuery.data.links);
    } else {
      setName(initial?.name ?? '');
      setDescription(initial?.description ?? '');
      setDeadline(initial?.deadline ?? undefined);
      setDone(initial?.done ?? false);
      setEstimatedTimeMinutes(initial?.estimatedTimeMinutes ?? undefined);
      setStaffMemberIds(initial?.staffMemberIds ?? []);
      setLinks(
        initial?.links ?? {
          workOrders: [],
          purchaseOrders: [],
          specialOrders: [],
          transferOrders: [],
          cycleCounts: [],
          serials: [],
        },
      );
    }
  }, [taskQuery.data, id, open]);

  const taskScheduleEventsQuery = useScheduleEventsQuery(
    {
      fetch,
      id: 'all',
      filters: {
        taskId: id ?? undefined,
        from: new Date(0),
        to: new Date(LOAD_DATE.getTime() + 10 * YEAR_IN_MS),
        published: true,
      },
    },
    { enabled: id !== null },
  );

  const [shouldShowStaffMemberSelector, setShouldShowStaffMemberSelector] = useState(false);
  const staffMemberQueries = useEmployeeQueries({
    fetch,
    ids: unique([
      ...staffMemberIds,
      ...(taskScheduleEventsQuery.data?.flatMap(event => event.assignedStaffMemberIds) ?? []),
    ]),
  });

  return (
    <>
      <Modal
        open={open && !shouldShowStaffMemberSelector}
        title={title}
        onClose={onClose}
        loading={taskQuery.isLoading || taskScheduleEventsQuery.isLoading}
        primaryAction={
          !editable
            ? undefined
            : {
                content: id === null ? 'Create' : 'Save',
                loading: taskMutation.isPending,
                disabled: !name,
                onAction: () => {
                  taskMutation.mutate(
                    {
                      id,
                      name,
                      description,
                      estimatedTimeMinutes: estimatedTimeMinutes ?? null,
                      deadline: deadline ?? null,
                      done,
                      staffMemberIds,
                      links,
                    },
                    { onSuccess: onClose },
                  );
                },
              }
        }
      >
        <Modal.Section>
          <FormLayout>
            {taskQuery.isError && (
              <Modal.Section>
                <Banner
                  title="Error loading task"
                  tone="critical"
                  action={{ content: 'Retry', onAction: taskQuery.refetch }}
                >
                  {extractErrorMessage(taskQuery.error, 'An error occurred while loading the task')}
                </Banner>
              </Modal.Section>
            )}

            <TextField
              label="Name"
              autoComplete="off"
              readOnly={!editable}
              value={name}
              requiredIndicator
              onChange={setName}
            />

            <TextField
              label="Description"
              autoComplete="off"
              readOnly={!editable}
              value={description}
              multiline
              onChange={setDescription}
            />

            <DateTimeField
              label="Deadline"
              value={deadline}
              onChange={setDeadline}
              readOnly={!editable}
              labelAction={!deadline ? undefined : { content: 'Clear', onAction: () => setDeadline(undefined) }}
            />

            <TextField
              label="Time Required (minutes)"
              autoComplete="off"
              readOnly={!editable}
              inputMode="numeric"
              value={estimatedTimeMinutes?.toString()}
              step={1}
              onChange={value =>
                setEstimatedTimeMinutes(!!value && Number.isFinite(Number(value)) ? Number(value) : undefined)
              }
            />

            <Checkbox label="Done" checked={done} onChange={checked => setDone(checked)} disabled={!editable} />
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
              searchable={staffMemberIds.length > 5}
              resourceName={{ singular: 'staff member', plural: 'staff members' }}
              disabled={!editable}
            />
            <Button
              variant="plain"
              icon={PlusMinor}
              onClick={() => setShouldShowStaffMemberSelector(true)}
              disabled={!editable}
            >
              Add staff member
            </Button>
          </BlockStack>
        </Modal.Section>

        {id !== null && (
          <Modal.Section>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd" fontWeight="bold">
                Scheduled time
                {!!taskScheduleEventsQuery.data?.length &&
                  ` (${humanizeDuration(
                    taskScheduleEventsQuery.data
                      ?.map(event => event.end.getTime() - event.start.getTime())
                      .reduce((acc, val) => acc + val, 0) ?? 0,
                  )})`}
              </Text>

              {taskScheduleEventsQuery.isError && (
                <Modal.Section>
                  <Banner
                    title="Error loading task events"
                    tone="critical"
                    action={{ content: 'Retry', onAction: taskScheduleEventsQuery.refetch }}
                  >
                    {extractErrorMessage(taskScheduleEventsQuery.error, 'An error occurred while loading task evens')}
                  </Banner>
                </Modal.Section>
              )}

              {!taskScheduleEventsQuery.data?.length && (
                <Text as="p" variant="bodyMd" tone="subdued">
                  No scheduled time
                </Text>
              )}

              {taskScheduleEventsQuery.data?.map(event => (
                <TaskModalEventCard key={event.id} eventId={event.id} scheduleId={event.scheduleId} />
              ))}
            </BlockStack>
          </Modal.Section>
        )}
      </Modal>

      <MultiStaffMemberSelectorModal
        open={shouldShowStaffMemberSelector}
        onClose={() => setShouldShowStaffMemberSelector(false)}
        selected={staffMemberIds}
        onChange={setStaffMemberIds}
      />

      {toast}
    </>
  );
}

function TaskModalEventCard({ scheduleId, eventId }: { scheduleId: number; eventId: number }) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const eventQuery = useScheduleEventQuery({ fetch, scheduleId, eventId });

  if (eventQuery.isError) {
    return (
      <Banner
        title="Error loading task event"
        tone="critical"
        action={{ content: 'Retry', onAction: eventQuery.refetch }}
      >
        {extractErrorMessage(eventQuery.error, 'An error occurred while loading the task event')}
        {toast}
      </Banner>
    );
  }

  if (eventQuery.isPending) {
    return (
      <Card>
        <Spinner />
        {toast}
      </Card>
    );
  }

  const event = eventQuery.data;

  return (
    <Card>
      <BlockStack gap="100">
        <InlineStack gap="200" align="space-between">
          <Text as="p" variant="bodyMd" fontWeight="bold">
            {event.name}
          </Text>

          <Text as="p" variant="bodyMd" tone="subdued">
            {humanizeDuration(event.end.getTime() - event.start.getTime())}
          </Text>
        </InlineStack>

        <Text as="p" variant="bodyMd" tone="subdued">
          {event.description}
        </Text>

        <StaffMemberNames staffMemberIds={event.assignedStaffMemberIds} />
      </BlockStack>

      {toast}
    </Card>
  );
}

function StaffMemberNames({ staffMemberIds }: { staffMemberIds: ID[] }) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const staffMemberQueries = useEmployeeQueries({ fetch, ids: staffMemberIds });

  const errorQueries = Object.values(staffMemberQueries).filter(query => query.isError);

  if (errorQueries.length > 0) {
    return (
      <Banner
        title="Error loading staff members"
        tone="warning"
        action={{
          content: 'Retry',
          onAction: () => errorQueries.forEach(query => query.refetch()),
        }}
      >
        {extractErrorMessage(errorQueries[0]!.error, 'An error occurred while loading staff members')}

        {toast}
      </Banner>
    );
  }

  return (
    <Text as="p" variant="bodyMd" tone="subdued">
      {staffMemberIds.length === 0
        ? 'No staff members assigned'
        : Object.values(staffMemberQueries)
            .map(query => query.data?.name ?? 'Unknown staff member')
            .join(', ')}

      {toast}
    </Text>
  );
}
