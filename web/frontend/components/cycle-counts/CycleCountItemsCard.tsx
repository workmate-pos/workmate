import { Badge, BlockStack, Card, InlineStack, ResourceItem, ResourceList, Text, Thumbnail } from '@shopify/polaris';
import { CreateCycleCount, CreateCycleCountItem } from '@web/schemas/generated/create-cycle-count.js';
import { DetailedCycleCount } from '@web/services/cycle-count/types.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { CreateCycleCountDispatch } from '@work-orders/common/create-cycle-count/reducer.js';
import { useState } from 'react';
import { useToast } from '@teifi-digital/shopify-app-react';
import { CycleCountItemModal, getCycleCountApplicationStateBadge } from './modals/CycleCountItemModal.js';
import { ButtonGroup, Button } from '@shopify/polaris';

interface Props {
  createCycleCount: CreateCycleCount;
  cycleCount: DetailedCycleCount | null;
  dispatch: CreateCycleCountDispatch;
  disabled: boolean;
  onAddProducts: () => void;
}

export function CycleCountItemsCard({ createCycleCount, cycleCount, dispatch, disabled, onAddProducts }: Props) {
  const [toast, setToastAction] = useToast();
  const [selectedItem, setSelectedItem] = useState<CreateCycleCountItem | null>(null);

  const fetch = useAuthenticatedFetch({ setToastAction });
  const productVariantIds = unique(createCycleCount.items.map(item => item.productVariantId));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  if (createCycleCount.items.length === 0) {
    return (
      <Card>
        <BlockStack gap="400" align="center">
          <Text as="h2" variant="headingMd" fontWeight="bold">
            No products added
          </Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            Add products to begin your cycle count
          </Text>
          <Button onClick={onAddProducts} disabled={disabled}>
            Add products
          </Button>
        </BlockStack>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <Text as="h2" variant="headingMd" fontWeight="bold">
              Products ({createCycleCount.items.length})
            </Text>
            <ButtonGroup>
              <Button onClick={onAddProducts} disabled={disabled}>
                Add products
              </Button>
            </ButtonGroup>
          </InlineStack>

          <ResourceList
            items={createCycleCount.items}
            resourceName={{ singular: 'product', plural: 'products' }}
            renderItem={item => {
              const productVariantQuery = productVariantQueries[item.productVariantId];
              const productVariant = productVariantQuery?.data;
              const cycleCountItem = cycleCount?.items.find(hasPropertyValue('uuid', item.uuid));

              const productName = getProductVariantName(
                productVariant ?? {
                  title: item.productVariantTitle,
                  product: { title: item.productTitle, hasOnlyDefaultVariant: false },
                },
              );

              const applicationBadge = getCycleCountApplicationStateBadge(
                cycleCountItem?.applicationStatus ?? 'not-applied',
                {
                  appliedQuantity: cycleCountItem?.applications.at(-1)?.appliedQuantity ?? 0,
                  countQuantity: item.countQuantity,
                },
              );

              return (
                <ResourceItem
                  id={item.uuid}
                  onClick={() => setSelectedItem(item)}
                  disabled={disabled}
                  media={
                    <Thumbnail
                      source={productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url ?? ''}
                      alt={productName ?? ''}
                    />
                  }
                >
                  <BlockStack gap="200">
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="p" variant="bodyMd" fontWeight="bold">
                        {productName}
                      </Text>
                      {/* TODO: move this badge to the thumbnail */}
                      <Badge tone="info">{item.countQuantity.toString()}</Badge>
                    </InlineStack>
                    <InlineStack gap="200" blockAlign="center">
                      <Badge tone={applicationBadge.tone}>{applicationBadge.children}</Badge>
                    </InlineStack>
                    {productVariant?.sku && (
                      <Text as="p" variant="bodyMd" tone="subdued">
                        SKU: {productVariant.sku}
                      </Text>
                    )}
                  </BlockStack>
                </ResourceItem>
              );
            }}
          />
        </BlockStack>
      </Card>

      {selectedItem && (
        <CycleCountItemModal
          open={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          item={selectedItem}
          onSave={item => {
            dispatch.setItems({
              items: createCycleCount.items.map(x => (x.uuid === item.uuid ? item : x)),
            });
          }}
          onRemove={() => {
            dispatch.setItems({
              items: createCycleCount.items.filter(x => x.uuid !== selectedItem.uuid),
            });
          }}
          cycleCountName={null}
          setToastAction={setToastAction}
        />
      )}

      {toast}
    </>
  );
}
