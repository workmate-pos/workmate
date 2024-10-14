import { Task } from '@web/services/tasks/queries.js';
import { DetailedTask, useTaskQuery } from '@work-orders/common/queries/use-task-query.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useTaskMutation } from '@work-orders/common/queries/use-task-mutation.js';
import {
  Banner,
  DatePicker,
  ScrollView,
  Selectable,
  Stack,
  Text,
  useApi,
} from '@shopify/ui-extensions-react/point-of-sale';
import { useEffect, useState } from 'react';
import { YEAR_IN_MS } from '@work-orders/common/time/constants.js';
import { useScheduleEventsQuery } from '@work-orders/common/queries/use-schedule-events-query.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { FormButton } from '@teifi-digital/pos-tools/components/form/FormButton.js';
import { Form } from '@teifi-digital/pos-tools/components/form/Form.js';
import { Route, UseRouter } from '../router.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { FormStringField } from '@teifi-digital/pos-tools/components/form/FormStringField.js';
import { MultiEmployeeSelectorProps } from '../selector/MultiEmployeeSelector.js';
import { useScreen } from '@teifi-digital/pos-tools/router';

const LOAD_DATE = new Date();

export type TaskModalProps = {
  onSave: (task: Task) => void;
  editable?: boolean;
  /**
   * Null when creating a new task.
   */
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

  useRouter: UseRouter<{
    MultiEmployeeSelector: Route<MultiEmployeeSelectorProps>;
  }>;
};

/**
 * Equivalent of TaskModal in admin.
 */
export function TaskModal({ onSave, editable, id, initial, useRouter }: TaskModalProps) {
  const router = useRouter();
  const { toast } = useApi<'pos.home.modal.render'>();

  const fetch = useAuthenticatedFetch();

  const taskQuery = useTaskQuery({ fetch, id });
  const taskMutation = useTaskMutation(
    { fetch },
    {
      onSuccess: task => {
        toast.show('Saved task');
        onSave(task);
      },
    },
  );

  const title = ['Task', taskQuery.data?.name].filter(Boolean).join(' - ');
  const screen = useScreen();
  screen.setTitle(title);

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
  }, [taskQuery.data, id]);

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

  const [shouldShowDatePicker, setShouldShowDatePicker] = useState(false);

  const staffMemberQueries = useEmployeeQueries({
    fetch,
    ids: unique([
      ...staffMemberIds,
      ...(taskScheduleEventsQuery.data?.flatMap(event => event.assignedStaffMemberIds) ?? []),
    ]),
  });

  return (
    <ScrollView>
      <Text>{JSON.stringify(links, null, 2)}</Text>
      <Text>{JSON.stringify(initial, null, 2)}</Text>

      <DatePicker
        inputMode="inline"
        selected={deadline?.toISOString()}
        visibleState={[shouldShowDatePicker, setShouldShowDatePicker]}
        onChange={deadline => setDeadline(new Date(deadline))}
      />

      <Form>
        <Stack direction="vertical" spacing={2}>
          {taskQuery.isError && (
            <Banner
              title="Error loading task"
              variant="error"
              action="Retry"
              onPress={() => taskQuery.refetch()}
              visible
            >
              {extractErrorMessage(taskQuery.error, 'An error occurred while loading the task')}
            </Banner>
          )}

          <FormStringField label="Name" value={name} onChange={setName} required disabled={!editable} />

          <FormStringField
            label="Description"
            value={description}
            onChange={setDescription}
            type="area"
            disabled={!editable}
          />

          <FormStringField
            label="Deadline"
            value={deadline?.toLocaleDateString()}
            onFocus={() => setShouldShowDatePicker(true)}
            disabled={!editable}
            action={
              !!editable ? { label: 'Clear', onPress: () => setDeadline(undefined), disabled: !deadline } : undefined
            }
          />

          <FormStringField
            label="Estimated time (minutes)"
            value={estimatedTimeMinutes?.toString()}
            type="numeric"
            onChange={value =>
              setEstimatedTimeMinutes(!!value && Number.isFinite(Number(value)) ? Number(value) : undefined)
            }
            disabled={!editable}
          />

          <FormButton
            title={`${done ? '✅' : '❌'} Done`}
            onPress={() => setDone(current => !current)}
            disabled={!editable}
          />

          <Stack direction="vertical" spacing={2} paddingVertical={'Small'}>
            <Text variant="headingSmall">Assigned staff members</Text>

            {staffMemberIds.length === 0 && (
              <Text variant="body" color="TextSubdued">
                No staff members assigned
              </Text>
            )}

            {staffMemberIds.map(staffMemberId => {
              const staffMember = staffMemberQueries[staffMemberId]?.data;
              return (
                <Stack direction="horizontal" spacing={2} key={staffMemberId} alignment="space-between">
                  <Stack direction="vertical" spacing={0.5} alignment={'center'}>
                    <Text variant="body">{staffMember?.name ?? 'Unknown staff member'}</Text>
                    {!!staffMember?.email && (
                      <Text variant="body" color="TextSubdued">
                        {staffMember.email}
                      </Text>
                    )}
                  </Stack>
                  <Selectable onPress={() => setStaffMemberIds(current => current.filter(x => x !== staffMemberId))}>
                    <Text color="TextCritical">Remove</Text>
                  </Selectable>
                </Stack>
              );
            })}

            <FormButton
              action="button"
              title="➕ Add staff member"
              disabled={!editable}
              onPress={() => {
                router.push('MultiEmployeeSelector', {
                  initialSelection: staffMemberIds,
                  onSelect: staffMembers => setStaffMemberIds(staffMembers.map(staffMember => staffMember.id)),
                  useRouter,
                });
              }}
            />
          </Stack>

          {editable && (
            <FormButton
              title={id === null ? 'Create' : 'Save'}
              type="primary"
              loading={taskMutation.isPending}
              disabled={!name}
              action="submit"
              onPress={() => {
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
                  {
                    onSuccess: () => {
                      router.popCurrent();
                    },
                  },
                );
              }}
            />
          )}
        </Stack>
      </Form>
    </ScrollView>
  );
}
