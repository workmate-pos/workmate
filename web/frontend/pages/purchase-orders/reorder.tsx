import { PermissionBoundary } from '@web/frontend/components/PermissionBoundary.js';
import {
  Banner,
  BlockStack,
  Box,
  Card,
  EmptyState,
  FormLayout,
  Frame,
  IndexFilters,
  IndexFiltersMode,
  IndexTable,
  InlineStack,
  Modal,
  Page,
  ResourceItem,
  ResourceList,
  Select,
  SkeletonBodyText,
  SkeletonThumbnail,
  Text,
  TextField,
  Thumbnail,
  useIndexResourceState,
} from '@shopify/polaris';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useAllLocationsQuery } from '@work-orders/common/queries/use-all-locations-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { TitleBar } from '@shopify/app-bridge-react';
import { useReorderPlanQuery } from '@work-orders/common/queries/use-reorder-plan-query.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useEffect, useMemo, useState } from 'react';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { emptyState } from '@web/frontend/assets/index.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useBulkCreatePurchaseOrderMutation } from '@work-orders/common/queries/use-bulk-create-purchase-order-mutation.js';
import { BulkCreatePurchaseOrders } from '@web/schemas/generated/bulk-create-purchase-orders.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { uuid } from '@work-orders/common/util/uuid.js';
import { Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { ReorderPointCsvUploadDropZoneModal } from '@web/frontend/components/reorder-points/ReorderPointCsvUploadDropZoneModal.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useSupplierQuery } from '@work-orders/common/queries/use-supplier-query.js';
import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';

const PAGE_SIZE = 50;

export default function () {
  return (
    <Frame>
      <Page fullWidth>
        <PermissionBoundary permissions={['write_purchase_orders', 'read_settings']}>
          <Reorder />
        </PermissionBoundary>
      </Page>
    </Frame>
  );
}

function Reorder() {
  const [locationId, setLocationId] = useState<ID>();
  const [mode, setMode] = useState<IndexFiltersMode>(IndexFiltersMode.Default);
  const [query, setQuery] = useState('');

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const locationsQuery = useAllLocationsQuery({ fetch });
  const reorderPlanQuery = useReorderPlanQuery({ fetch, locationId });

  const filteredReorderPlanItems = reorderPlanQuery.data?.filter(
    item =>
      !query ||
      item.vendor.toLowerCase().includes(query.toLowerCase()) ||
      getProductVariantName(productVariantQueries[item.productVariantId]?.data)
        ?.toLowerCase()
        .includes(query.toLowerCase()),
  );

  const productVariantIds = reorderPlanQuery.data?.map(plan => plan.productVariantId) ?? [];
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const { clearSelection, selectedResources, handleSelectionChange, allResourcesSelected } = useIndexResourceState(
    reorderPlanQuery.data ?? [],
    { resourceIDResolver: item => item.inventoryItemId },
  );

  useEffect(() => {
    clearSelection();
  }, [locationId]);

  const [isCreatePurchaseOrderModalOpen, setIsBulkCreatePurchaseOrdersModalOpen] = useState(false);
  const [isCsvUploadDropZoneModalOpen, setIsCsvUploadDropZoneModalOpen] = useState(false);

  return (
    <Card>
      <TitleBar
        title="Re-order"
        secondaryActions={[
          {
            content: 'Import CSV',
            onAction: () => setIsCsvUploadDropZoneModalOpen(true),
          },
        ]}
      />

      <Text as="h1" variant="headingMd" fontWeight="bold">
        Reorder
      </Text>

      <Text as="p" variant="bodyMd" tone="subdued">
        Re-order products based on preconfigured re-ordering rules and current location quantities.
      </Text>

      <Box paddingBlock="200"></Box>

      {locationsQuery.isError && (
        <Box paddingBlock="200">
          <Banner
            title="Error loading locations"
            tone="critical"
            action={{
              content: 'Retry',
              onAction: () => locationsQuery.refetch(),
            }}
          >
            {extractErrorMessage(locationsQuery.error, 'An error occurred while loading locations')}
          </Banner>
        </Box>
      )}

      <IndexFilters
        canCreateNewView={false}
        mode={mode}
        setMode={setMode}
        filters={[]}
        onQueryChange={setQuery}
        onQueryClear={() => setQuery('')}
        onClearAll={() => {
          setQuery('');
          clearSelection();
        }}
        queryValue={query}
        queryPlaceholder="Search product variants"
        tabs={
          locationsQuery.data?.map(location => ({
            id: location.id,
            content: location.name,
            selected: location.id === locationId,
            onAction: () => setLocationId(location.id),
          })) ?? []
        }
        selected={locationsQuery.data?.findIndex(location => location.id === locationId) ?? -1}
        loading={locationsQuery.isFetching}
      />

      <IndexTable
        headings={[
          {
            title: 'Image',
            hidden: true,
          },
          {
            title: 'Product variant',
          },
          {
            title: 'Vendor',
          },
          {
            title: 'Min quantity',
            alignment: 'end',
          },
          {
            title: 'Max quantity',
            alignment: 'end',
          },
          {
            title: 'Available quantity',
            alignment: 'end',
          },
          {
            title: 'Incoming quantity',
            alignment: 'end',
          },
          {
            title: 'Quantity to order',
            alignment: 'end',
          },
        ]}
        resourceName={{ singular: 'product variant', plural: 'product variants' }}
        emptyState={!!locationId ? undefined : <EmptyState heading="No location selected" image={emptyState} />}
        itemCount={filteredReorderPlanItems?.length ?? (!locationId ? 0 : PAGE_SIZE)}
        loading={reorderPlanQuery.isFetching}
        onSelectionChange={handleSelectionChange}
        selectable
        selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
        promotedBulkActions={[
          {
            content: 'Create purchase orders',
            disabled: !selectedResources.length && !allResourcesSelected,
            onAction: () => setIsBulkCreatePurchaseOrdersModalOpen(true),
          },
        ]}
      >
        {filteredReorderPlanItems?.map((item, i) => {
          const productVariantQuery = productVariantQueries[item.productVariantId];
          const imageUrl =
            productVariantQuery?.data?.image?.url ?? productVariantQuery?.data?.product.featuredImage?.url;
          const productVariantName = getProductVariantName(productVariantQuery?.data);

          return (
            <IndexTable.Row
              key={item.inventoryItemId}
              id={item.inventoryItemId}
              selected={allResourcesSelected || selectedResources.includes(item.inventoryItemId)}
              position={i}
            >
              <IndexTable.Cell>
                {!!imageUrl && (
                  <Thumbnail source={imageUrl} alt={productVariantName ?? 'Unknown product'} size="small" />
                )}
                {!imageUrl && <SkeletonThumbnail size="small" />}
              </IndexTable.Cell>
              <IndexTable.Cell>
                {!!productVariantQuery?.data ? (
                  <Text as="p" variant="bodyMd" fontWeight="bold">
                    {productVariantName ?? 'Unknown product'}
                  </Text>
                ) : (
                  <SkeletonBodyText lines={1} />
                )}
              </IndexTable.Cell>
              <IndexTable.Cell>{item.vendor}</IndexTable.Cell>
              <IndexTable.Cell>
                <Text as="p" numeric alignment="end">
                  {item.min}
                </Text>
              </IndexTable.Cell>
              <IndexTable.Cell>
                <Text as="p" numeric alignment="end">
                  {item.max}
                </Text>
              </IndexTable.Cell>
              <IndexTable.Cell>
                <Text as="p" numeric alignment="end">
                  {item.availableQuantity}
                </Text>
              </IndexTable.Cell>
              <IndexTable.Cell>
                <Text as="p" numeric alignment="end">
                  {item.incomingQuantity}
                </Text>
              </IndexTable.Cell>
              <IndexTable.Cell>
                <Text as="p" numeric alignment="end">
                  {item.orderQuantity}
                </Text>
              </IndexTable.Cell>
            </IndexTable.Row>
          );
        })}

        {!reorderPlanQuery.data &&
          Array.from({ length: PAGE_SIZE }, (_, i) => (
            <IndexTable.Row key={i} id={String(i)} selected={false} position={i}>
              <IndexTable.Cell>
                <SkeletonThumbnail size="small" />
              </IndexTable.Cell>
              <IndexTable.Cell>
                <SkeletonBodyText lines={1} />
              </IndexTable.Cell>
              <IndexTable.Cell>
                <SkeletonBodyText lines={1} />
              </IndexTable.Cell>
              <IndexTable.Cell>
                <SkeletonBodyText lines={1} />
              </IndexTable.Cell>
              <IndexTable.Cell>
                <SkeletonBodyText lines={1} />
              </IndexTable.Cell>
              <IndexTable.Cell>
                <SkeletonBodyText lines={1} />
              </IndexTable.Cell>
              <IndexTable.Cell>
                <SkeletonBodyText lines={1} />
              </IndexTable.Cell>
            </IndexTable.Row>
          ))}
      </IndexTable>

      <BulkCreatePurchaseOrdersModal
        open={isCreatePurchaseOrderModalOpen}
        onClose={() => setIsBulkCreatePurchaseOrdersModalOpen(false)}
        locationId={locationId}
        lineItems={
          reorderPlanQuery.data
            ?.filter(item => allResourcesSelected || selectedResources.includes(item.inventoryItemId))
            .map(item => ({
              vendor: item.vendor,
              productVariantId: item.productVariantId,
              quantity: item.orderQuantity,
            })) ?? []
        }
      />

      <ReorderPointCsvUploadDropZoneModal
        open={isCsvUploadDropZoneModalOpen}
        onClose={() => setIsCsvUploadDropZoneModalOpen(false)}
      />

      {toast}
    </Card>
  );
}

function BulkCreatePurchaseOrdersModal({
  open,
  onClose,
  locationId,
  lineItems,
}: {
  open: boolean;
  onClose: () => void;
  locationId?: ID;
  lineItems: {
    vendor: string;
    productVariantId: ID;
    quantity: number;
  }[];
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const bulkCreatePurchaseOrderMutation = useBulkCreatePurchaseOrderMutation({ fetch });

  const settingsQuery = useSettingsQuery({ fetch });
  const purchaseOrderCustomFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'PURCHASE_ORDER' });
  const lineItemCustomFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'LINE_ITEM' });
  const locationQuery = useLocationQuery({ fetch, id: locationId ?? null });

  const productVariantIds = lineItems.map(lineItem => lineItem.productVariantId);
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const [shipTo, setShipTo] = useState('');
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    setNote(`This purchase order was created through the re-order feature on ${new Date().toLocaleDateString()}`);
  }, [open]);

  useEffect(() => {
    if (locationQuery.data) {
      setShipTo(locationQuery.data.address.formatted.join('\n'));
    }
  }, [open, locationQuery.data]);

  useEffect(() => {
    if (settingsQuery.data) {
      setStatus(settingsQuery.data.settings.purchaseOrders.defaultStatus);
    }
  }, [open, settingsQuery.data]);

  const bulkCreatePurchaseOrders: BulkCreatePurchaseOrders = useMemo(() => {
    if (
      !open ||
      !settingsQuery.data ||
      !locationId ||
      !purchaseOrderCustomFieldsPresetsQuery.data ||
      !lineItemCustomFieldsPresetsQuery.data ||
      !locationQuery.data ||
      !status ||
      !shipTo ||
      Object.values(productVariantQueries).some(query => !query.isSuccess)
    ) {
      return { purchaseOrders: [] };
    }

    const vendors = new Set(lineItems.map(lineItem => lineItem.vendor));

    return {
      purchaseOrders: [...vendors].map(vendorName => ({
        name: null,
        type: 'NORMAL',
        supplierId: null,
        vendorName,
        status,
        note,
        locationId,
        // no way to set this currently - will need to switch from vendor to supplier first
        shipFrom: '',
        shipTo,
        lineItems: lineItems
          .filter(lineItem => lineItem.vendor === vendorName)
          .map(
            lineItem =>
              ({
                uuid: uuid(),
                customFields: lineItemCustomFieldsPresetsQuery.data.defaultCustomFields,
                productVariantId: lineItem.productVariantId,
                serialNumber: null,
                specialOrderLineItem: null,
                quantity: lineItem.quantity,
                unitCost: (productVariantQueries[lineItem.productVariantId]?.data?.inventoryItem.unitCost?.amount ??
                  '0.00') as Money,
              }) satisfies BulkCreatePurchaseOrders['purchaseOrders'][number]['lineItems'][number],
          ),
        customFields: purchaseOrderCustomFieldsPresetsQuery.data.defaultCustomFields,
        employeeAssignments: [],
        placedDate: null,
        discount: null,
        tax: null,
        shipping: null,
        deposited: null,
        paid: null,
      })),
    };
  }, [
    lineItems,
    open,
    locationId,
    settingsQuery.data,
    purchaseOrderCustomFieldsPresetsQuery.data,
    lineItemCustomFieldsPresetsQuery.data,
    locationQuery.data,
    status,
    shipTo,
  ]);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={'Create purchase orders'}
        loading={settingsQuery.isPending}
        primaryAction={{
          content: `Create ${bulkCreatePurchaseOrders.purchaseOrders.length} purchase order${bulkCreatePurchaseOrders.purchaseOrders.length === 1 ? '' : 's'}`,
          loading: bulkCreatePurchaseOrderMutation.isPending,
          disabled: !bulkCreatePurchaseOrders.purchaseOrders.length,
          onAction: () => {
            if (!bulkCreatePurchaseOrders.purchaseOrders.length) {
              return;
            }

            bulkCreatePurchaseOrderMutation.mutate(bulkCreatePurchaseOrders, {
              onSuccess(result) {
                const successCount = result.purchaseOrders.filter(result => result.type === 'success').length;
                const errorCount = result.purchaseOrders.filter(result => result.type === 'error').length;

                setToastAction({
                  content: `Created ${successCount} / ${result.purchaseOrders.length} purchase order${successCount === 1 ? '' : 's'}${errorCount > 0 ? ` (${errorCount} failed)` : ''}`,
                });

                onClose();
              },
            });
          },
        }}
      >
        {!locationId && (
          <Modal.Section>
            <Banner title="Select a location" tone="critical">
              You must select a location to create purchase orders
            </Banner>
          </Modal.Section>
        )}

        {!lineItems.length && (
          <Modal.Section>
            <Banner title="No purchase orders to create" tone="critical">
              You must select at least one product variant to create a purchase order
            </Banner>
          </Modal.Section>
        )}

        <Modal.Section>
          <FormLayout>
            <Select
              label="Status"
              requiredIndicator
              placeholder="Select a status"
              options={
                settingsQuery.data?.settings.purchaseOrders.statuses.map(status => ({
                  label: status,
                  value: status,
                })) ?? []
              }
              disabled={!settingsQuery.data}
              onChange={setStatus}
              value={status}
            />

            <TextField label="Ship to" autoComplete="off" multiline value={shipTo} onChange={setShipTo} />

            <TextField label="Note" autoComplete="off" multiline value={note} onChange={note => setNote(note)} />
          </FormLayout>
        </Modal.Section>

        {!!bulkCreatePurchaseOrders.purchaseOrders.length && (
          <Modal.Section>
            <BlockStack gap="200">
              {bulkCreatePurchaseOrders.purchaseOrders.map(purchaseOrder => (
                <PurchaseOrderPreview key={purchaseOrder.name} purchaseOrder={purchaseOrder} />
              ))}
            </BlockStack>
          </Modal.Section>
        )}
      </Modal>

      {toast}
    </>
  );
}

function PurchaseOrderPreview({ purchaseOrder }: { purchaseOrder: CreatePurchaseOrder }) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const productVariantIds = unique(purchaseOrder.lineItems.map(li => li.productVariantId));

  const supplierQuery = useSupplierQuery({ fetch, id: purchaseOrder.supplierId });
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  return (
    <BlockStack gap="200">
      <Text as="h2" variant="headingMd" fontWeight="bold">
        {supplierQuery.isLoading && <SkeletonBodyText lines={1} />}
        {supplierQuery.isError && (
          <Text as="p" tone="critical">
            {extractErrorMessage(supplierQuery.error, 'Error loading supplier')}
          </Text>
        )}
        {supplierQuery.data?.name}
      </Text>

      <ResourceList
        items={purchaseOrder.lineItems}
        renderItem={lineItem => {
          const productVariantQuery = productVariantQueries[lineItem.productVariantId];
          const productVariant = productVariantQuery?.data;
          const imageUrl = productVariant?.image?.url ?? productVariant?.product.featuredImage?.url;
          const name = getProductVariantName(productVariant) ?? 'Unknown product';

          return (
            <ResourceItem id={lineItem.uuid} onClick={() => {}}>
              <InlineStack gap="200" align="space-between" blockAlign="center">
                <InlineStack gap="400">
                  {imageUrl && <Thumbnail source={imageUrl} alt={name} />}
                  {!imageUrl && <SkeletonThumbnail />}
                  <BlockStack gap="050">
                    <Text as="p" variant="bodyMd" fontWeight="bold">
                      {name}
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      {productVariant?.sku}
                    </Text>
                  </BlockStack>
                </InlineStack>
                <Text as="p" variant="bodyMd">
                  {lineItem.quantity}
                </Text>
              </InlineStack>
            </ResourceItem>
          );
        }}
        resourceName={{ singular: 'line item', plural: 'line items' }}
      />

      {toast}
    </BlockStack>
  );
}
