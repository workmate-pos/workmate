import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import {
  Badge,
  BlockStack,
  Filters,
  InlineStack,
  Modal,
  ResourceItem,
  ResourceList,
  Text,
  Thumbnail,
} from '@shopify/polaris';
import { ToastActionCallable } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { useState } from 'react';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { CreatePurchaseOrder, Int } from '@web/schemas/generated/create-purchase-order.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useInventoryItemQueries } from '@work-orders/common/queries/use-inventory-item-query.js';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';

/**
 * Simple list of products to select from
 */
export function AddProductModal({
  open,
  onClose,
  onAdd,
  setToastAction,
  locationId,
  vendorName,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (products: CreatePurchaseOrder['lineItems'][number][]) => void;
  setToastAction: ToastActionCallable;
  locationId: ID;
  vendorName: string;
}) {
  const [page, setPage] = useState(0);
  const [query, setQuery, optimisticQuery] = useDebouncedState('');

  const fetch = useAuthenticatedFetch({ setToastAction });
  const currencyFormatter = useCurrencyFormatter({ fetch });

  const locationQuery = useLocationQuery({ fetch, id: locationId });

  const vendorQuery = vendorName ? `vendor:"${vendorName}"` : undefined;
  const locationIdQuery = locationId ? `locationId:${parseGid(locationId).id}` : undefined;
  const productVariantsQuery = useProductVariantsQuery({
    fetch,
    params: {
      query: [query, vendorQuery, locationIdQuery].filter(Boolean).join(' AND '),
    },
    options: {
      onSuccess(data) {
        // when we load from scratch we should reset the page count
        if (data.pages.length === 1) {
          setPage(0);
        }
      },
    },
  });

  const allProductVariants =
    productVariantsQuery.data?.pages
      ?.flat()
      .flatMap(pv => [pv, ...pv.productVariantComponents.map(component => component.productVariant)]) ?? [];
  const inventoryItemIds = unique(allProductVariants.map(pv => pv.inventoryItem.id));
  const inventoryItemQueries = useInventoryItemQueries({ fetch, ids: inventoryItemIds, locationId });

  const location = locationQuery?.data;
  const productVariants = productVariantsQuery.data?.pages?.[page] ?? [];

  const isLoading =
    locationQuery.isLoading ||
    productVariantsQuery.isLoading ||
    Object.values(inventoryItemQueries).some(query => query.isLoading);

  const isLastAvailablePage = productVariantsQuery.data && page === productVariantsQuery.data.pages.length - 1;
  const hasNextPage = !isLastAvailablePage || productVariantsQuery.hasNextPage;

  return (
    <Modal open={open} onClose={onClose} title={'Add Product'}>
      {(location || vendorName) && (
        <Modal.Section>
          <InlineStack align={'center'}>
            <Text as={'h3'} fontWeight={'semibold'}>
              Displaying products
              {location ? ` at ${location.name}` : ''}
              {vendorName ? ` from ${vendorName}` : ''}
            </Text>
          </InlineStack>
        </Modal.Section>
      )}

      <ResourceList
        filterControl={
          <Filters
            filters={[]}
            queryPlaceholder={'Search products'}
            queryValue={optimisticQuery}
            onQueryChange={setQuery}
            onQueryClear={() => setQuery('', true)}
            onClearAll={() => setQuery('', true)}
          />
        }
        items={productVariants}
        resolveItemId={item => item.id}
        renderItem={productVariant => {
          const name = getProductVariantName(productVariant) ?? 'Unknown product';
          const imageUrl = productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url;

          // the product variants to add. will be more than 1 if this PV is a bundle
          const productVariants = productVariant.requiresComponents
            ? productVariant.productVariantComponents
            : [{ productVariant, quantity: 1 as Int }];

          const availableQuantity = Math.min(
            0,
            ...productVariants.map(pv => {
              const inventoryItem = inventoryItemQueries[pv.productVariant.inventoryItem.id]?.data;
              return (
                inventoryItem?.inventoryLevel?.quantities?.find(quantity => quantity.name === 'available')?.quantity ??
                0
              );
            }),
          );

          const isLoading = productVariants.some(pv => !inventoryItemQueries[pv.productVariant.inventoryItem.id]?.data);

          const productsToAdd = productVariants.flatMap(pv => {
            const unitCost = inventoryItemQueries[pv.productVariant.inventoryItem.id]?.data?.unitCost?.amount;

            return {
              shopifyOrderLineItem: null,
              unitCost: BigDecimal.fromString(unitCost ?? '0.00')
                .round(2)
                .toMoney(),
              productVariantId: pv.productVariant.id,
              quantity: pv.quantity,
              availableQuantity: 0 as Int,
            };
          });

          const totalCost = BigDecimal.sum(
            ...productsToAdd.map(p =>
              BigDecimal.fromMoney(p.unitCost).multiply(BigDecimal.fromString(p.quantity.toFixed(0))),
            ),
          ).toMoney();

          return (
            <ResourceItem
              id={productVariant.id}
              disabled={isLoading}
              onClick={() => {
                if (isLoading) {
                  return;
                }

                if (!productVariants.length) {
                  return;
                }

                onAdd(productsToAdd);

                const thing = productVariants.length > 1 ? 'products' : 'product';
                setToastAction({ content: `Added ${thing}` });
              }}
              name={name}
            >
              <BlockStack gap={'200'}>
                <InlineStack align={'space-between'} blockAlign={'center'}>
                  <InlineStack gap={'400'}>
                    <Badge tone="info-strong">{String(availableQuantity ?? '?')}</Badge>
                    {imageUrl && <Thumbnail alt={name} source={imageUrl} />}
                  </InlineStack>
                  <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
                    {currencyFormatter(totalCost)}
                  </Text>
                </InlineStack>
                <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
                  {name}
                </Text>
                <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
                  {productVariant.sku}
                </Text>
              </BlockStack>
            </ResourceItem>
          );
        }}
        loading={isLoading}
        pagination={{
          hasNext: hasNextPage,
          hasPrevious: page > 0,
          onPrevious: () => setPage(page => page - 1),
          onNext: () => {
            if (isLastAvailablePage) {
              productVariantsQuery.fetchNextPage();
            }

            setPage(page => page + 1);
          },
        }}
      />
    </Modal>
  );
}
