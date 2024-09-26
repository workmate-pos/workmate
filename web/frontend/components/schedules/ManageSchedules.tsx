import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useEmployeeSchedulesQuery } from '@work-orders/common/queries/use-employee-schedules-query.js';
import { getInfiniteQueryPagination } from '@web/frontend/util/pagination.js';
import { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  EmptyState,
  FormLayout,
  IndexFilters,
  IndexFiltersMode,
  IndexTable,
  InlineStack,
  Modal,
  Select,
  Text,
  TextField,
  useIndexResourceState,
} from '@shopify/polaris';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { emptyState } from '@web/frontend/assets/index.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useLocationQueries } from '@work-orders/common/queries/use-location-query.js';
import { EmployeeSchedule } from '@web/services/schedules/queries.js';
import { DateTimeField } from '@web/frontend/components/form/DateTimeField.js';
import { useBulkEmployeeScheduleMutation } from '@work-orders/common/queries/use-bulk-employee-schedule-mutation.js';
import { DateTime } from '@web/schemas/generated/bulk-upsert-schedules.js';
import { useBulkDeleteEmployeeScheduleMutation } from '@work-orders/common/queries/use-bulk-delete-employee-schedule-mutation.js';
import { ManageSchedule } from '@web/frontend/components/schedules/ManageSchedule.js';
import { useEmployeeScheduleMutation } from '@work-orders/common/queries/use-employee-schedule-mutation.js';
import { UpdatePublicationStatusModal } from '@web/frontend/components/schedules/modals/UpdatePublicationStatusModal.js';

export function ManageSchedules() {
  const [id, setId] = useState<number>();

  if (id === undefined) {
    return <ScheduleList setScheduleId={setId} />;
  }

  return <ManageSchedule id={id} onBack={() => setId(undefined)} />;
}

export function ScheduleList({ setScheduleId }: { setScheduleId: (id: number) => void }) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const [query, setQuery, optimisticQuery] = useDebouncedState('');
  // TODO: Location filter
  const [locationId, setLocationId] = useState<ID>();

  const schedulesQuery = useEmployeeSchedulesQuery({
    fetch,
    filters: { limit: 100, query, locationId },
  });

  const locationIds = unique(
    schedulesQuery.data?.pages
      .flatMap(page => page)
      .map(schedule => schedule.locationId)
      .filter(isNonNullable) ?? [],
  );

  const locationQueries = useLocationQueries({ fetch, ids: locationIds });

  const [pageIndex, setPage] = useState(0);
  const pagination = getInfiniteQueryPagination(0, setPage, schedulesQuery);
  const page = schedulesQuery.data?.pages[pageIndex] ?? [];

  const { removeSelectedResources, allResourcesSelected, selectedResources, handleSelectionChange, clearSelection } =
    useIndexResourceState(schedulesQuery.data?.pages.flat() ?? [], {
      resourceIDResolver: schedule => schedule.id.toString(),
    });

  const [isUpdatePublicationStatusModalOpen, setIsUpdatePublicationStatusModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isCreateScheduleModalOpen, setIsCreateScheduleModalOpen] = useState(false);

  const [mode, setMode] = useState<IndexFiltersMode>(IndexFiltersMode.Default);

  return (
    <>
      <Box paddingBlock={'400'}>
        <InlineStack align={'end'}>
          <Button variant={'primary'} onClick={() => setIsCreateScheduleModalOpen(true)}>
            New Schedule
          </Button>
        </InlineStack>
      </Box>

      <IndexFilters
        mode={mode}
        setMode={setMode}
        filters={[]}
        queryPlaceholder="Search schedules"
        queryValue={optimisticQuery}
        onQueryChange={query => setQuery(query, !query)}
        onQueryClear={() => setQuery('', true)}
        onClearAll={() => setQuery('', true)}
        selected={0}
        tabs={[]}
      />

      <IndexTable
        headings={[
          {
            title: 'Name',
          },
          {
            title: 'Location',
          },
          {
            title: 'Publication Status',
          },
        ]}
        itemCount={page.length}
        loading={schedulesQuery.isFetching}
        selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
        onSelectionChange={handleSelectionChange}
        selectable
        emptyState={
          <EmptyState
            heading="No schedules found"
            image={emptyState}
            action={{
              content: 'New Schedule',
              onAction: () => setIsCreateScheduleModalOpen(true),
            }}
          />
        }
        pagination={{
          hasNext: pagination.hasNextPage,
          hasPrevious: pagination.hasPreviousPage,
          onNext: () => pagination.next(),
          onPrevious: () => pagination.previous(),
        }}
        promotedBulkActions={[
          {
            content: 'Change Publication Status',
            onAction: () => setIsUpdatePublicationStatusModalOpen(true),
          },
          {
            content: 'Delete',
            onAction: () => setIsBulkDeleteModalOpen(true),
          },
        ]}
      >
        {page.map((schedule, i) => (
          <IndexTable.Row
            key={schedule.id}
            id={schedule.id.toString()}
            position={i}
            selected={selectedResources.includes(schedule.id.toString())}
            onClick={() => setScheduleId(schedule.id)}
          >
            <IndexTable.Cell>{schedule.name}</IndexTable.Cell>

            <IndexTable.Cell>
              {schedule.locationId ? (
                locationQueries[schedule.locationId]?.data?.name
              ) : (
                <Text as="p" numeric>
                  &mdash;
                </Text>
              )}
            </IndexTable.Cell>

            <IndexTable.Cell>
              {!schedule.publishedAt && <Badge tone="info">Draft</Badge>}
              {schedule.publishedAt && new Date(schedule.publishedAt).getTime() > new Date().getTime() && (
                <Badge tone="warning">Scheduled</Badge>
              )}
              {schedule.publishedAt && new Date(schedule.publishedAt).getTime() <= new Date().getTime() && (
                <Badge tone="success">Published</Badge>
              )}
            </IndexTable.Cell>
          </IndexTable.Row>
        ))}
      </IndexTable>

      <UpdatePublicationStatusModal
        open={isUpdatePublicationStatusModalOpen}
        onClose={() => setIsUpdatePublicationStatusModalOpen(false)}
        schedules={
          schedulesQuery.data?.pages.flat().filter(schedule => selectedResources.includes(schedule.id.toString())) ?? []
        }
      />

      <BulkDeleteModal
        open={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        schedules={
          schedulesQuery.data?.pages.flat().filter(schedule => selectedResources.includes(schedule.id.toString())) ?? []
        }
      />

      <CreateScheduleModal
        open={isCreateScheduleModalOpen}
        onClose={() => setIsCreateScheduleModalOpen(false)}
        onCreate={id => setScheduleId(id)}
      />

      {toast}
    </>
  );
}

function BulkDeleteModal({
  open,
  onClose,
  schedules,
}: {
  open: boolean;
  onClose: () => void;
  schedules: EmployeeSchedule[];
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const bulkDeleteMutation = useBulkDeleteEmployeeScheduleMutation({ fetch });

  return (
    <>
      <Modal
        open={open}
        title={'Delete Schedules'}
        onClose={onClose}
        primaryAction={{
          content: `Delete ${schedules.length} schedule${schedules.length === 1 ? '' : 's'}`,
          destructive: true,
          loading: bulkDeleteMutation.isPending,
          onAction: () => {
            bulkDeleteMutation.mutate(
              { schedules: schedules.map(({ id }) => ({ id })) },
              {
                onSuccess() {
                  setToastAction({ content: 'Deleted schedules' });
                  onClose();
                },
              },
            );
          },
        }}
      >
        <Modal.Section>
          <Text as="p" variant="bodyMd" fontWeight="bold">
            Are you sure you want to delete the selected schedules?
          </Text>
          <Text as="p" variant="bodyMd" tone="critical">
            This action cannot be undone.
          </Text>
        </Modal.Section>
      </Modal>

      {toast}
    </>
  );
}

function CreateScheduleModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (id: number) => void;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const scheduleMutation = useEmployeeScheduleMutation(
    { fetch },
    {
      onSuccess: schedule => {
        setName('');
        setLocationId(undefined);

        onCreate(schedule.id);
        onClose();
      },
    },
  );

  const [name, setName] = useState('');
  // TODO: Location selector
  const [locationId, setLocationId] = useState<ID>();

  return (
    <>
      <Modal
        open={open}
        title={'Create Schedule'}
        onClose={onClose}
        primaryAction={{
          content: 'Create',
          disabled: !name,
          loading: scheduleMutation.isPending,
          onAction: () => {
            scheduleMutation.mutate({
              id: null,
              name,
              locationId: locationId ?? null,
              publishedAt: null,
            });
          },
        }}
      >
        <Modal.Section>
          <FormLayout>
            <TextField label={'Name'} autoComplete="off" value={name} onChange={setName} requiredIndicator />
          </FormLayout>
        </Modal.Section>
      </Modal>

      {toast}
    </>
  );
}
