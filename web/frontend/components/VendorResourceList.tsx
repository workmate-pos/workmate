import { BlockStack, Box, InlineStack, ResourceItem, ResourceList, Text } from '@shopify/polaris';
import { ReactNode } from 'react';
import { ResourceListPaginationProps } from '@shopify/polaris/build/ts/src/components/ResourceList/index.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';

type Vendor = { name: string };

export function VendorResourceList({
  vendors,
  onClick,
  render = vendor => <VendorResourceItemContent vendor={vendor} />,
  emptyState,
  selectable,
  selectedItems,
  filterControl,
  pagination,
  onSelectionChange,
  loading,
}: {
  vendors: string[];
  onClick: (vendor: string) => void;
  render?: (vendor: Vendor) => ReactNode;
  emptyState?: ReactNode;
  selectable?: boolean;
  selectedItems?: string[];
  onSelectionChange?: (vendors: string[]) => void;
  filterControl?: ReactNode;
  pagination?: ResourceListPaginationProps;
  loading?: boolean;
}) {
  return (
    <ResourceList
      items={unique([...vendors, ...(selectedItems ?? [])]).map(vendor => ({ vendor }))}
      resolveItemId={({ vendor }) => vendor}
      idForItem={({ vendor }) => vendor}
      resourceName={{ singular: 'vendor', plural: 'vendors' }}
      emptyState={emptyState ?? <VendorResourceListEmptyState verb="found" />}
      filterControl={filterControl}
      pagination={pagination}
      selectable={selectable}
      flushFilters
      selectedItems={selectedItems}
      onSelectionChange={selection => {
        onSelectionChange?.(selection === 'All' ? unique([...vendors, ...(selectedItems ?? [])]) : selection);
      }}
      loading={loading}
      renderItem={({ vendor }) =>
        !vendors.includes(vendor) ? null : (
          <VendorResourceItem vendor={vendor} onClick={() => onClick(vendor)} render={render} />
        )
      }
    />
  );
}

function VendorResourceItem({
  vendor,
  onClick,
  disabled,
  render,
}: {
  vendor: string;
  onClick: () => void;
  disabled?: boolean;
  render: (vendor: Vendor) => ReactNode;
}) {
  return (
    <ResourceItem
      key={vendor}
      id={vendor}
      onClick={onClick}
      disabled={disabled}
      name={vendor}
      verticalAlignment="center"
    >
      {render({ name: vendor })}
    </ResourceItem>
  );
}

export function VendorResourceItemContent({ vendor, right }: { vendor: Vendor; right?: ReactNode }) {
  return (
    <InlineStack gap="200" align="space-between" blockAlign="center">
      <BlockStack>
        <Text as="p" variant="bodyMd" fontWeight="bold">
          {vendor.name}
        </Text>
      </BlockStack>

      {right}
    </InlineStack>
  );
}

export function VendorResourceListEmptyState({ verb, children }: { verb: string; children?: ReactNode }) {
  return (
    <Box paddingBlock="400">
      <BlockStack gap="200" inlineAlign="center">
        <Text as="p" variant="bodyMd" tone="subdued">
          No vendors {verb}
        </Text>

        {children}
      </BlockStack>
    </Box>
  );
}
