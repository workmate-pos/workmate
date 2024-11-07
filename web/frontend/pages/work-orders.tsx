import {
  Badge,
  Card,
  EmptyState,
  Frame,
  IndexFilters,
  IndexFiltersMode,
  IndexTable,
  InlineStack,
  Modal,
  Page,
  SkeletonBodyText,
  Text,
  useIndexResourceState,
} from '@shopify/polaris';
import { PermissionBoundary } from '../components/PermissionBoundary.js';
import { Loading, TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { emptyState } from '@web/frontend/assets/index.js';
import { Redirect } from '@shopify/app-bridge/actions';
import { useState } from 'react';
import { useDebouncedState } from '../hooks/use-debounced-state.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { useWorkOrderInfoQuery } from '@work-orders/common/queries/use-work-order-info-query.js';
import { useCustomerQueries } from '@work-orders/common/queries/use-customer-query.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { WorkOrderCsvUploadDropZoneModal } from '@web/frontend/components/work-orders/WorkOrderCsvUploadDropZoneModal.js';
import { getInfiniteQueryPagination } from '@web/frontend/util/pagination.js';
import { useBulkDeleteWorkOrderMutation } from '@work-orders/common/queries/use-bulk-delete-work-order-mutation.js';

export default function () {
  return (
    <Frame>
      <Page>
        <PermissionBoundary permissions={['read_work_orders', 'read_settings']}>
          <WorkOrders />
        </PermissionBoundary>
      </Page>
    </Frame>
  );
}

function WorkOrders() {
  const app = useAppBridge();

  const [query, setQuery, internalQuery] = useDebouncedState('');
  const [mode, setMode] = useState<IndexFiltersMode>(IndexFiltersMode.Default);
  const [isCsvUploadDropZoneModalOpen, setIsCsvUploadDropZoneModalOpen] = useState(false);

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const workOrderInfoQuery = useWorkOrderInfoQuery({
    fetch,
    query,
    customFieldFilters: [],
  });

  const [pageIndex, setPageIndex] = useState(0);
  const pagination = getInfiniteQueryPagination(pageIndex, setPageIndex, workOrderInfoQuery);

  const allWorkOrders = workOrderInfoQuery.data?.pages?.flat() ?? [];
  const workOrders = workOrderInfoQuery.data?.pages?.[pageIndex] ?? [];

  const customerIds = unique(workOrders.map(workOrder => workOrder.customerId));
  const customerQueries = useCustomerQueries({ fetch, ids: customerIds });

  const settingsQuery = useSettingsQuery({ fetch });

  const { selectedResources, clearSelection, handleSelectionChange, allResourcesSelected } = useIndexResourceState(
    allWorkOrders,
    { resourceIDResolver: workOrder => workOrder.name },
  );

  const [shouldShowBulkDeleteModal, setShouldShowBulkDeleteModal] = useState(false);

  if (settingsQuery.isLoading) {
    return <Loading />;
  }

  const redirectToWorkOrder = (workOrderName: 'new' | string) => {
    Redirect.create(app).dispatch(Redirect.Action.APP, `/work-orders/${encodeURIComponent(workOrderName)}`);
  };

  return (
    <>
      <TitleBar
        title="Work orders"
        primaryAction={{
          content: 'New work order',
          onAction: () => redirectToWorkOrder('new'),
        }}
        secondaryActions={[
          {
            content: 'Import CSV',
            onAction: () => setIsCsvUploadDropZoneModalOpen(true),
          },
        ]}
      />

      <IndexFilters
        mode={mode}
        setMode={setMode}
        filters={[]}
        appliedFilters={[]}
        onQueryChange={query => setQuery(query)}
        onQueryClear={() => setQuery('', true)}
        queryValue={internalQuery}
        onClearAll={() => {
          setQuery('', true);
          clearSelection();
        }}
        tabs={[{ content: 'All', id: 'all' }]}
        canCreateNewView={false}
        selected={0}
      />

      <IndexTable
        headings={[
          { title: 'Work order' },
          { title: 'Status' },
          { title: 'Customer' },
          { title: 'SO #' },
          { title: 'SPO #' },
          { title: 'PO #' },
        ]}
        itemCount={allWorkOrders.length}
        loading={workOrderInfoQuery.isFetchingNextPage}
        emptyState={
          !workOrderInfoQuery.isFetchingNextPage && (
            <Card>
              <EmptyState
                heading={'Work order'}
                image={emptyState}
                action={{
                  content: 'Create work order',
                  onAction: () => redirectToWorkOrder('new'),
                }}
              >
                Track and manage your inventory.
              </EmptyState>
            </Card>
          )
        }
        pagination={{
          hasNext: pagination.hasNextPage,
          hasPrevious: pagination.hasPreviousPage,
          onPrevious: () => pagination.previous(),
          onNext: () => pagination.next(),
        }}
        selectable
        selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
        onSelectionChange={handleSelectionChange}
        promotedBulkActions={[
          {
            content: 'Delete',
            onAction: () => setShouldShowBulkDeleteModal(true),
          },
        ]}
      >
        {workOrders.map((workOrder, i) => (
          <IndexTable.Row
            key={workOrder.name}
            id={workOrder.name}
            position={i}
            selected={allResourcesSelected || selectedResources.includes(workOrder.name)}
            onClick={() => redirectToWorkOrder(workOrder.name)}
          >
            <IndexTable.Cell>
              <Text as={'p'} fontWeight={'bold'} variant="bodyMd">
                {workOrder.name}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Badge tone={'info'}>{workOrder.status}</Badge>
            </IndexTable.Cell>
            <IndexTable.Cell>
              {(() => {
                const customerQuery = customerQueries[workOrder.customerId];

                if (!customerQuery) {
                  return null;
                }

                if (customerQuery.isLoading) {
                  return <SkeletonBodyText lines={1} />;
                }

                return customerQuery.data?.displayName;
              })()}
            </IndexTable.Cell>
            <IndexTable.Cell>
              <InlineStack gap="100">
                {workOrder.orders
                  .filter(hasPropertyValue('type', 'ORDER'))
                  .map(order => order.name)
                  .map((sp, i) => (
                    <Badge tone="enabled" key={i}>
                      {sp}
                    </Badge>
                  ))}
              </InlineStack>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <InlineStack gap="100">
                {unique(
                  workOrder.items
                    .filter(hasPropertyValue('type', 'product'))
                    .flatMap(item => item.specialOrders.map(spo => spo.name)),
                ).map((sp, i) => (
                  <Badge tone="enabled" key={i}>
                    {sp}
                  </Badge>
                ))}
              </InlineStack>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <InlineStack gap="100">
                {unique(
                  workOrder.items
                    .filter(hasPropertyValue('type', 'product'))
                    .flatMap(item => item.purchaseOrders.map(po => po.name)),
                ).map((sp, i) => (
                  <Badge tone="enabled" key={i}>
                    {sp}
                  </Badge>
                ))}
              </InlineStack>
            </IndexTable.Cell>
          </IndexTable.Row>
        ))}
      </IndexTable>

      <WorkOrderCsvUploadDropZoneModal
        open={isCsvUploadDropZoneModalOpen}
        onClose={() => setIsCsvUploadDropZoneModalOpen(false)}
      />

      <BulkDeleteWorkOrdersModal
        open={shouldShowBulkDeleteModal}
        onClose={() => setShouldShowBulkDeleteModal(false)}
        onDelete={() => clearSelection()}
        names={selectedResources}
      />

      {toast}
    </>
  );
}

function BulkDeleteWorkOrdersModal({
  open,
  onClose,
  onDelete,
  names,
}: {
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
  names: string[];
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const bulkDeleteWorkOrderMutation = useBulkDeleteWorkOrderMutation({ fetch });

  return (
    <>
      <Modal
        open={open}
        title={'Delete work orders'}
        onClose={onClose}
        primaryAction={{
          content: `Delete ${names.length} work order${names.length === 1 ? '' : 's'}`,
          destructive: true,
          loading: bulkDeleteWorkOrderMutation.isPending,
          onAction: () => {
            bulkDeleteWorkOrderMutation.mutate(
              { workOrders: names.map(name => ({ name })) },
              {
                onSuccess(result) {
                  const successCount = result.workOrders.filter(result => result.type === 'success').length;
                  const errorCount = result.workOrders.filter(result => result.type === 'error').length;

                  setToastAction({
                    content: `Deleted ${successCount} / ${result.workOrders.length} work order${successCount === 1 ? '' : 's'}${errorCount > 0 ? ` (${errorCount} cannot be deleted)` : ''}`,
                  });

                  onDelete();
                  onClose();
                },
              },
            );
          },
        }}
      >
        <Modal.Section>
          <Text as="p" variant="bodyMd" fontWeight="bold">
            Are you sure you want to delete the selected work orders?
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
