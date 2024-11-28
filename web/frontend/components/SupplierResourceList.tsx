import { BlockStack, Box, InlineStack, ResourceItem, ResourceList, SkeletonBodyText, Text } from '@shopify/polaris';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { ReactNode } from 'react';
import { ResourceListPaginationProps } from '@shopify/polaris/build/ts/src/components/ResourceList/index.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { DetailedSupplier } from '@web/services/suppliers/get.js';
import { useSupplierQuery } from '@work-orders/common/queries/use-supplier-query.js';

export function SupplierResourceList({
  supplierIds,
  onClick,
  render = supplier => <SupplierResourceItemContent supplier={supplier} />,
  emptyState,
  selectable,
  selectedItems,
  filterControl,
  pagination,
  onSelectionChange,
  loading,
}: {
  supplierIds: number[];
  onClick: (supplierId: number) => void;
  render?: (supplier: DetailedSupplier) => ReactNode;
  emptyState?: ReactNode;
  selectable?: boolean;
  selectedItems?: number[];
  onSelectionChange?: (supplierIds: number[]) => void;
  filterControl?: ReactNode;
  pagination?: ResourceListPaginationProps;
  loading?: boolean;
}) {
  return (
    <ResourceList
      items={unique([...supplierIds, ...(selectedItems ?? [])]).map(supplierId => ({ supplierId }))}
      resolveItemId={({ supplierId }) => String(supplierId)}
      idForItem={({ supplierId }) => String(supplierId)}
      resourceName={{ singular: 'supplier', plural: 'suppliers' }}
      emptyState={emptyState ?? <SupplierResourceListEmptyState verb="found" />}
      filterControl={filterControl}
      pagination={pagination}
      selectable={selectable}
      flushFilters
      selectedItems={selectedItems?.map(supplierId => String(supplierId))}
      onSelectionChange={selection => {
        onSelectionChange?.(
          (selection === 'All' ? unique([...supplierIds, ...(selectedItems ?? [])]) : selection).map(id => Number(id)),
        );
      }}
      loading={loading}
      renderItem={({ supplierId }) =>
        !supplierIds.includes(supplierId) ? null : (
          <SupplierResourceItem supplierId={supplierId} onClick={() => onClick(supplierId)} render={render} />
        )
      }
    />
  );
}

function SupplierResourceItem({
  supplierId,
  onClick,
  disabled,
  render,
}: {
  supplierId: number;
  onClick: () => void;
  disabled?: boolean;
  render: (supplier: DetailedSupplier) => ReactNode;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const supplierQuery = useSupplierQuery({ fetch, id: supplierId });

  return (
    <ResourceItem
      key={supplierId}
      id={String(supplierId)}
      onClick={onClick}
      disabled={disabled}
      name={supplierQuery.data?.name ?? `Supplier ${supplierId}`}
      verticalAlignment="center"
    >
      {supplierQuery.isLoading && <SkeletonBodyText lines={1} />}
      {supplierQuery.isError && (
        <Text as="p" tone="critical">
          {extractErrorMessage(supplierQuery.error, 'An error occurred while loading supplier')}
        </Text>
      )}

      {supplierQuery.data && render(supplierQuery.data)}

      {toast}
    </ResourceItem>
  );
}

export function SupplierResourceItemContent({ supplier, right }: { supplier: DetailedSupplier; right?: ReactNode }) {
  const { name, vendors } = supplier;

  return (
    <InlineStack gap="200" align="space-between" blockAlign="center">
      <BlockStack>
        <Text as="p" variant="bodyMd" fontWeight="bold">
          {name}
        </Text>

        <Text as="p" variant="bodyMd" tone="subdued">
          {vendors.length} vendor{vendors.length === 1 ? '' : 's'}
        </Text>
      </BlockStack>

      {right}
    </InlineStack>
  );
}

export function SupplierResourceListEmptyState({ verb, children }: { verb: string; children?: ReactNode }) {
  return (
    <Box paddingBlock="400">
      <BlockStack gap="200" inlineAlign="center">
        <Text as="p" variant="bodyMd" tone="subdued">
          No suppliers {verb}
        </Text>

        {children}
      </BlockStack>
    </Box>
  );
}
