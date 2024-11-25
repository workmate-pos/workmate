import {
  BlockStack,
  Box,
  InlineStack,
  ResourceItem,
  ResourceList,
  SkeletonBodyText,
  SkeletonThumbnail,
  Text,
  Thumbnail,
} from '@shopify/polaris';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { ReactNode } from 'react';
import { ProductVariant } from '@work-orders/common/queries/use-product-variants-query.js';
import { ResourceListPaginationProps } from '@shopify/polaris/build/ts/src/components/ResourceList/index.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';

export type ProductVariantResourceListProps = {
  productVariantIds: ID[];
  onClick: (productVariantId: ID) => void;
  render?: (productVariant: ProductVariant) => ReactNode;
  emptyState?: ReactNode;
  selectable?: boolean;
  selectedItems?: ID[];
  onSelectionChange?: (productVariantIds: ID[]) => void;
  filterControl?: ReactNode;
  pagination?: ResourceListPaginationProps;
  loading?: boolean;
};

export function ProductVariantResourceList({
  productVariantIds,
  onClick,
  render = productVariant => <ProductVariantResourceItemContent productVariant={productVariant} />,
  emptyState = <ProductVariantResourceListEmptyState verb="found" />,
  selectable,
  selectedItems,
  filterControl,
  pagination,
  onSelectionChange,
  loading,
}: ProductVariantResourceListProps) {
  return (
    <ResourceList
      items={unique([...productVariantIds, ...(selectedItems ?? [])])}
      resolveItemId={productVariantId => productVariantId}
      idForItem={productVariantId => productVariantId}
      resourceName={{ singular: 'product variant', plural: 'product variants' }}
      emptyState={emptyState}
      filterControl={filterControl}
      pagination={pagination}
      selectable={selectable}
      flushFilters
      selectedItems={selectedItems}
      onSelectionChange={selection => {
        onSelectionChange?.(
          selection === 'All' ? unique([...productVariantIds, ...(selectedItems ?? [])]) : (selection as ID[]),
        );
      }}
      loading={loading}
      renderItem={productVariantId =>
        !productVariantIds.includes(productVariantId) ? null : (
          <ProductVariantResourceItem
            productVariantId={productVariantId}
            onClick={() => onClick(productVariantId)}
            render={render}
          />
        )
      }
    />
  );
}

function ProductVariantResourceItem({
  productVariantId,
  onClick,
  disabled,
  render,
}: {
  productVariantId: ID;
  onClick: () => void;
  disabled?: boolean;
  render: (productVariant: ProductVariant) => ReactNode;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const productVariantQuery = useProductVariantQuery({ fetch, id: productVariantId });

  const name = getProductVariantName(productVariantQuery.data) ?? 'Unknown product';
  const imageUrl = productVariantQuery.data?.image?.url ?? productVariantQuery.data?.product?.featuredImage?.url;

  return (
    <ResourceItem
      key={productVariantId}
      id={productVariantId}
      onClick={onClick}
      disabled={disabled}
      media={imageUrl ? <Thumbnail source={imageUrl} alt={name} /> : <SkeletonThumbnail />}
      name={name}
      verticalAlignment="center"
    >
      {productVariantQuery.isLoading && <SkeletonBodyText lines={1} />}
      {productVariantQuery.isError && (
        <Text as="p" tone="critical">
          {extractErrorMessage(productVariantQuery.error, 'An error occurred while loading product')}
        </Text>
      )}

      {productVariantQuery.data && render(productVariantQuery.data)}

      {toast}
    </ResourceItem>
  );
}

export function ProductVariantResourceItemContent({
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

  return (
    <InlineStack gap="200" align="space-between" blockAlign="center" wrap={false}>
      <BlockStack>
        <Text as="p" variant="bodyMd" fontWeight="bold">
          {name}
        </Text>

        {sku && (
          <Text as="p" variant="bodyMd" tone="subdued">
            {sku}
          </Text>
        )}

        {vendor && (
          <Text as="p" variant="bodyMd" tone="subdued">
            {vendor}
          </Text>
        )}
      </BlockStack>

      {right}
    </InlineStack>
  );
}

export function ProductVariantResourceListEmptyState({ verb, children }: { verb: string; children?: ReactNode }) {
  return (
    <Box paddingBlock="400">
      <BlockStack gap="200" inlineAlign="center">
        <Text as="p" variant="bodyMd" tone="subdued">
          No product variants {verb}
        </Text>

        {children}
      </BlockStack>
    </Box>
  );
}
