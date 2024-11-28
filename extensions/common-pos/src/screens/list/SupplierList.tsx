import { ReactNode } from 'react';
import { Banner, Button, Icon, Section, Selectable, Stack, Text } from '@shopify/ui-extensions-react/point-of-sale';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { DetailedSupplier } from '@web/services/suppliers/get.js';
import { useSupplierQuery } from '@work-orders/common/queries/use-supplier-query.js';

export type Pagination = {
  onNext: () => void;
  onPrevious: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
};

export type SupplierListProps = {
  supplierIds: number[];
  onClick: (supplierId: number) => void;
  render?: (supplier: DetailedSupplier) => ReactNode;
  emptyState?: ReactNode;
  selectable?: boolean;
  selectedItems?: number[];
  onSelectionChange?: (supplierIds: number[]) => void;
  filterControl?: ReactNode;
  pagination?: Pagination;
  loading?: boolean;
};

export function SupplierList({
  supplierIds,
  onClick,
  render = supplier => <SupplierListItemContent supplier={supplier} />,
  emptyState = <SupplierListEmptyState verb="found" />,
  selectable,
  selectedItems,
  filterControl,
  pagination,
  loading,
}: SupplierListProps) {
  const paginationControls = pagination && <Pagination {...pagination} />;

  // TODO: Dedup with ProductVariantList
  return (
    <Stack direction="vertical" spacing={2}>
      {filterControl}

      {paginationControls}

      <Section>
        {loading && <Button title="" type="plain" isLoading />}

        {supplierIds.map(supplierId => (
          <SupplierListItem
            selectable={selectable}
            selected={selectedItems?.includes(supplierId)}
            key={supplierId}
            supplierId={supplierId}
            onClick={() => onClick(supplierId)}
            render={render}
          />
        ))}

        {!supplierIds.length && emptyState}
      </Section>

      {paginationControls}
    </Stack>
  );
}

function Pagination({ hasPrevious, onPrevious, hasNext, onNext }: Pagination) {
  return (
    <Stack direction="horizontal" spacing={2} flexChildren>
      <Button title={'‹'} type={'plain'} isDisabled={!hasPrevious} onPress={onPrevious} />
      <Button title={'›'} type={'plain'} isDisabled={!hasNext} onPress={onNext} />
    </Stack>
  );
}

function SupplierListItem({
  supplierId,
  onClick,
  disabled,
  render,
  selectable,
  selected,
}: {
  supplierId: number;
  onClick: () => void;
  disabled?: boolean;
  render: (supplier: DetailedSupplier) => ReactNode;
  selectable?: boolean;
  selected?: boolean;
}) {
  const fetch = useAuthenticatedFetch();

  const supplierQuery = useSupplierQuery({ fetch, id: supplierId });

  return (
    <Selectable onPress={() => onClick()} disabled={disabled}>
      <Stack direction="horizontal" spacing={2} paddingVertical="Small" paddingHorizontal="Small">
        {selectable && <Icon name={selected ? 'checkmark-active' : 'checkmark-inactive'} />}

        <Stack direction="horizontal" spacing={2}>
          {supplierQuery.isLoading && <Button title="" type="plain" isLoading />}
          <Banner
            variant="error"
            title={extractErrorMessage(supplierQuery.error, 'Error loading supplier')}
            visible={supplierQuery.isError}
            action="Retry"
            onPress={() => supplierQuery.refetch()}
          />

          {supplierQuery.data && render(supplierQuery.data)}
        </Stack>
      </Stack>
    </Selectable>
  );
}

export function SupplierListItemContent({ supplier, right }: { supplier: DetailedSupplier; right?: ReactNode }) {
  const { name, vendors } = supplier;

  return (
    <Stack direction="horizontal" spacing={2} alignment="space-between" flexWrap="nowrap">
      <Stack direction="vertical">
        <Text variant="headingSmall">{name}</Text>

        <Text variant="body" color="TextSubdued">
          {vendors.length} vendor{vendors.length === 1 ? '' : 's'}
        </Text>
      </Stack>

      {right}
    </Stack>
  );
}

export function SupplierListEmptyState({ verb, children }: { verb: string; children?: ReactNode }) {
  return (
    <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
      <Text variant="body" color="TextSubdued">
        No suppliers {verb}
      </Text>

      {children}
    </Stack>
  );
}
