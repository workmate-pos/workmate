import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { ProductVariant } from '@work-orders/common/queries/use-product-variants-query.js';
import { ReactNode } from 'react';
import {
  Banner,
  Button,
  Icon,
  Image,
  Section,
  Selectable,
  Stack,
  Text,
} from '@shopify/ui-extensions-react/point-of-sale';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';

export type Pagination = {
  onNext: () => void;
  onPrevious: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
};

export type ProductVariantListProps = {
  productVariantIds: ID[];
  onClick: (productVariantId: ID) => void;
  render?: (productVariant: ProductVariant) => ReactNode;
  emptyState?: ReactNode;
  selectable?: boolean;
  selectedItems?: ID[];
  onSelectionChange?: (productVariantIds: ID[]) => void;
  filterControl?: ReactNode;
  pagination?: Pagination;
  loading?: boolean;
};

export function ProductVariantList({
  productVariantIds,
  onClick,
  render = productVariant => <ProductVariantListItemContent productVariant={productVariant} />,
  emptyState = <ProductVariantListEmptyState verb="found" />,
  selectable,
  selectedItems,
  filterControl,
  pagination,
  loading,
}: ProductVariantListProps) {
  const paginationControls = pagination && <Pagination {...pagination} />;

  return (
    <Stack direction="vertical" spacing={2}>
      {filterControl}

      {paginationControls}

      <Section>
        {loading && <Button title="" type="plain" isLoading />}

        {productVariantIds.map(productVariantId => (
          <ProductVariantListItem
            selectable={selectable}
            selected={selectedItems?.includes(productVariantId)}
            key={productVariantId}
            productVariantId={productVariantId}
            onClick={() => onClick(productVariantId)}
            render={render}
          />
        ))}

        {!productVariantIds.length && emptyState}
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

function ProductVariantListItem({
  productVariantId,
  onClick,
  disabled,
  render,
  selectable,
  selected,
}: {
  productVariantId: ID;
  onClick: () => void;
  disabled?: boolean;
  render: (productVariant: ProductVariant) => ReactNode;
  selectable?: boolean;
  selected?: boolean;
}) {
  const fetch = useAuthenticatedFetch();

  const productVariantQuery = useProductVariantQuery({ fetch, id: productVariantId });

  return (
    <Selectable onPress={() => onClick()} disabled={disabled}>
      <Stack direction="vertical" spacing={2} paddingVertical="Small" paddingHorizontal="Small">
        {selectable && <Icon name={selected ? 'checkmark-active' : 'checkmark-inactive'} />}

        {productVariantQuery.isLoading && <Button title="" type="plain" isLoading />}

        {productVariantQuery.isError && (
          <Banner
            variant="error"
            title={extractErrorMessage(productVariantQuery.error, 'Error loading product')}
            visible
            action="Retry"
            onPress={() => productVariantQuery.refetch()}
          />
        )}

        {productVariantQuery.data && render(productVariantQuery.data)}
      </Stack>
    </Selectable>
  );
}

export function ProductVariantListItemContent({
  productVariant,
  right,
}: {
  productVariant: ProductVariant;
  right?: ReactNode;
}) {
  const name = getProductVariantName(productVariant) ?? 'Unknown product';
  const {
    sku,
    product: { vendor },
  } = productVariant;

  const imageUrl = productVariant.image?.url ?? productVariant.product.featuredImage?.url;

  return (
    <Stack direction="horizontal" spacing={2} alignment="space-between" flex={1} flexChildren>
      <Stack direction="horizontal" spacing={2}>
        <Image src={imageUrl} />

        <Stack direction="vertical">
          <Text variant="headingSmall">{name}</Text>

          {sku && (
            <Text variant="body" color="TextSubdued">
              {sku}
            </Text>
          )}

          {vendor && (
            <Text variant="body" color="TextSubdued">
              {vendor}
            </Text>
          )}
        </Stack>
      </Stack>

      {right && (
        <Stack direction="horizontal" flex={1} alignment="flex-end">
          {right}
        </Stack>
      )}
    </Stack>
  );
}

export function ProductVariantListEmptyState({ verb, children }: { verb: string; children?: ReactNode }) {
  return (
    <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
      <Text variant="body" color="TextSubdued">
        No product variants {verb}
      </Text>

      {children}
    </Stack>
  );
}
