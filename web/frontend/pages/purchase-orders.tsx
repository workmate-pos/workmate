import {
  Badge,
  Card,
  ChoiceList,
  EmptyState,
  Frame,
  IndexFilters,
  IndexFiltersMode,
  IndexTable,
  InlineStack,
  Modal,
  Page,
  Text,
  useIndexResourceState,
} from '@shopify/polaris';
import { PermissionBoundary } from '../components/PermissionBoundary.js';
import { Loading, TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { usePurchaseOrderInfoPageQuery } from '@work-orders/common/queries/use-purchase-order-info-page-query.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { emptyState } from '@web/frontend/assets/index.js';
import { Redirect } from '@shopify/app-bridge/actions';
import { useState } from 'react';
import { useDebouncedState } from '../hooks/use-debounced-state.js';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { PurchaseOrderCsvUploadDropZoneModal } from '@web/frontend/components/purchase-orders/PurchaseOrderCsvUploadDropZoneModal.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { sentenceCase } from '@teifi-digital/shopify-app-toolbox/string';
import { getInfiniteQueryPagination } from '@web/frontend/util/pagination.js';
import { useBulkDeletePurchaseOrderMutation } from '@work-orders/common/queries/use-bulk-delete-purchase-order-mutation.js';

export default function () {
  return (
    <Frame>
      <Page fullWidth>
        <PermissionBoundary permissions={['read_purchase_orders']}>
          <PurchaseOrders />
        </PermissionBoundary>
      </Page>
    </Frame>
  );
}

function PurchaseOrders() {
  const app = useAppBridge();

  const [status, setStatus] = useState<string>();
  const [type, setType] = useState<'NORMAL' | 'DROPSHIP'>();
  const [query, setQuery, optimisticQuery] = useDebouncedState('');
  const [mode, setMode] = useState<IndexFiltersMode>(IndexFiltersMode.Default);
  const [isCsvUploadDropZoneModalOpen, setIsCsvUploadDropZoneModalOpen] = useState(false);

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const purchaseOrderInfoQuery = usePurchaseOrderInfoPageQuery({
    fetch,
    query,
    customFieldFilters: [],
    status,
    type,
  });

  const [pageIndex, setPageIndex] = useState(0);
  const pagination = getInfiniteQueryPagination(pageIndex, setPageIndex, purchaseOrderInfoQuery);

  const allPurchaseOrders = purchaseOrderInfoQuery.data?.pages?.flat() ?? [];
  const purchaseOrders = purchaseOrderInfoQuery.data?.pages?.[pageIndex] ?? [];

  const settingsQuery = useSettingsQuery({ fetch });

  const { selectedResources, clearSelection, handleSelectionChange, allResourcesSelected } = useIndexResourceState(
    allPurchaseOrders,
    { resourceIDResolver: purchaseOrder => purchaseOrder.name },
  );

  const [shouldShowBulkDeleteModal, setShouldShowBulkDeleteModal] = useState(false);

  if (settingsQuery.isLoading) {
    return <Loading />;
  }

  const redirectToPurchaseOrder = (purchaseOrderName: 'new' | string) => {
    Redirect.create(app).dispatch(Redirect.Action.APP, `/purchase-orders/${encodeURIComponent(purchaseOrderName)}`);
  };

  return (
    <>
      <TitleBar
        title="Purchase orders"
        secondaryActions={[
          {
            content: 'Re-order',
            onAction: () => redirectToPurchaseOrder('reorder'),
          },
          {
            content: 'Import CSV',
            onAction: () => setIsCsvUploadDropZoneModalOpen(true),
          },
          {
            content: 'Merge special orders',
            onAction: () => redirectToPurchaseOrder('merge'),
          },
        ]}
        primaryAction={{
          content: 'New purchase order',
          onAction: () => redirectToPurchaseOrder('new'),
        }}
      />

      <IndexFilters
        mode={mode}
        setMode={setMode}
        filters={[
          {
            key: 'status',
            label: 'Status',
            pinned: true,
            shortcut: true,
            disabled: !settingsQuery.data,
            filter: (
              <ChoiceList
                title="Status"
                choices={
                  settingsQuery.data?.settings.purchaseOrders.statuses.map(status => ({
                    label: status,
                    value: status,
                  })) ?? []
                }
                onChange={([status]) => setStatus(status)}
                selected={status ? [status] : []}
              />
            ),
          },
          {
            key: 'type',
            label: 'Type',
            pinned: true,
            shortcut: true,
            filter: (
              <ChoiceList
                title="Type"
                choices={[
                  {
                    label: 'Normal',
                    value: 'NORMAL',
                  },
                  {
                    label: 'Dropship',
                    value: 'DROPSHIP',
                  },
                ]}
                onChange={([type]) => setType(type as 'NORMAL' | 'DROPSHIP')}
                selected={type ? [type] : []}
              />
            ),
          },
        ]}
        appliedFilters={[
          ...(status
            ? [
                {
                  key: 'status',
                  label: `Status is ${status}`,
                  onRemove: () => setStatus(undefined),
                },
              ]
            : []),
        ]}
        onQueryChange={query => setQuery(query)}
        onQueryClear={() => setQuery('', true)}
        queryValue={optimisticQuery}
        onClearAll={() => {
          setQuery('', true);
          clearSelection();
        }}
        tabs={[]}
        canCreateNewView={false}
        loading={purchaseOrderInfoQuery.isFetching}
        selected={0}
      />

      <IndexTable
        headings={[
          { title: 'Purchase order' },
          { title: 'Status' },
          { title: 'Type' },
          { title: 'Location' },
          { title: 'Customer' },
          { title: 'SPO #' },
          { title: 'SO #' },
          { title: 'WO #' },
        ]}
        itemCount={allPurchaseOrders.length}
        loading={purchaseOrderInfoQuery.isFetching}
        emptyState={
          <Card>
            <EmptyState
              heading={'Purchase orders'}
              image={emptyState}
              action={{
                content: 'Create purchase order',
                onAction: () => redirectToPurchaseOrder('new'),
              }}
            >
              Track and manage your inventory.
            </EmptyState>
          </Card>
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
        {purchaseOrders.map((purchaseOrder, i) => (
          <IndexTable.Row
            key={purchaseOrder.name}
            id={purchaseOrder.name}
            position={i}
            selected={allResourcesSelected || selectedResources.includes(purchaseOrder.name)}
            onClick={() => redirectToPurchaseOrder(purchaseOrder.name)}
          >
            <IndexTable.Cell>
              <Text as={'p'} fontWeight={'bold'} variant="bodyMd">
                {purchaseOrder.name}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Badge tone={'info'}>{purchaseOrder.status}</Badge>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Badge>{sentenceCase(purchaseOrder.type)}</Badge>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as={'p'} variant="bodyMd">
                {purchaseOrder.location?.name}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <Text as={'p'} variant="bodyMd">
                {purchaseOrder.linkedCustomers.map(customer => customer.displayName).join(', ')}
              </Text>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <InlineStack gap="100">
                {unique(
                  purchaseOrder.lineItems.map(lineItem => lineItem.specialOrderLineItem?.name).filter(isNonNullable),
                ).map(spo => (
                  <Badge tone="enabled">{spo}</Badge>
                ))}
              </InlineStack>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <InlineStack gap="100">
                {purchaseOrder.linkedOrders
                  .filter(hasPropertyValue('orderType', 'ORDER'))
                  .map(order => order.name)
                  .map(sp => (
                    <Badge tone="enabled">{sp}</Badge>
                  ))}
              </InlineStack>
            </IndexTable.Cell>
            <IndexTable.Cell>
              <InlineStack gap="100">
                {purchaseOrder.linkedWorkOrders
                  .map(wo => wo.name)
                  .map(sp => (
                    <Badge tone="enabled">{sp}</Badge>
                  ))}
              </InlineStack>
            </IndexTable.Cell>
          </IndexTable.Row>
        ))}
      </IndexTable>

      <PurchaseOrderCsvUploadDropZoneModal
        open={isCsvUploadDropZoneModalOpen}
        onClose={() => setIsCsvUploadDropZoneModalOpen(false)}
      />

      <BulkDeletePurchaseOrdersModal
        open={shouldShowBulkDeleteModal}
        onClose={() => setShouldShowBulkDeleteModal(false)}
        onDelete={() => clearSelection()}
        names={selectedResources}
      />

      {toast}
    </>
  );
}

function BulkDeletePurchaseOrdersModal({
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

  const bulkDeletePurchaseOrderMutation = useBulkDeletePurchaseOrderMutation({ fetch });

  return (
    <>
      <Modal
        open={open}
        title={'Delete purchase orders'}
        onClose={onClose}
        primaryAction={{
          content: `Delete ${names.length} purchase order${names.length === 1 ? '' : 's'}`,
          destructive: true,
          loading: bulkDeletePurchaseOrderMutation.isPending,
          onAction: () => {
            bulkDeletePurchaseOrderMutation.mutate(
              { purchaseOrders: names.map(name => ({ name })) },
              {
                onSuccess(result) {
                  const successCount = result.purchaseOrders.filter(result => result.type === 'success').length;
                  const errorCount = result.purchaseOrders.filter(result => result.type === 'error').length;

                  setToastAction({
                    content: `Deleted ${successCount} / ${result.purchaseOrders.length} purchase order${successCount === 1 ? '' : 's'}${errorCount > 0 ? ` (${errorCount} cannot be deleted)` : ''}`,
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
            Are you sure you want to delete the selected purchase orders?
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
