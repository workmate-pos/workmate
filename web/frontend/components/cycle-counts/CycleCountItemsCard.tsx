import {
  Badge,
  BlockStack,
  Card,
  InlineStack,
  ResourceItem,
  ResourceList,
  Text,
  Thumbnail,
  Box,
  SkeletonThumbnail,
} from '@shopify/polaris';
import { CreateCycleCount, CreateCycleCountItem } from '@web/schemas/generated/create-cycle-count.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { CreateCycleCountDispatchProxy } from '@work-orders/common/create-cycle-count/reducer.js';
import { useState } from 'react';
import { useToast } from '@teifi-digital/shopify-app-react';
import { CycleCountItemModal } from './modals/CycleCountItemModal.js';
import { ButtonGroup, Button } from '@shopify/polaris';
import { useCycleCountQuery } from '@work-orders/common/queries/use-cycle-count-query.js';
import { getCycleCountApplicationStateBadge } from '@work-orders/common/create-cycle-count/get-cycle-count-application-state-badge.js';

interface Props {
  createCycleCount: CreateCycleCount;
  dispatch: CreateCycleCountDispatchProxy;
  disabled: boolean;
  onImportProducts: () => void;
  onScanProducts: () => void;
}

export function CycleCountItemsCard({ createCycleCount, dispatch, disabled, onImportProducts, onScanProducts }: Props) {
  const [toast, setToastAction] = useToast();
  const [selectedItem, setSelectedItem] = useState<CreateCycleCountItem | null>(null);

  const fetch = useAuthenticatedFetch({ setToastAction });
  const cycleCountQuery = useCycleCountQuery({ fetch, name: createCycleCount.name });
  const productVariantIds = unique(createCycleCount.items.map(item => item.productVariantId));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  return (
    <>
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd" fontWeight="bold">
            Products
          </Text>

          {createCycleCount.items.length > 0 ? (
            <ResourceList
              items={createCycleCount.items}
              resourceName={{ singular: 'product', plural: 'products' }}
              renderItem={item => {
                const productVariantQuery = productVariantQueries[item.productVariantId];
                const productVariant = productVariantQuery?.data;
                const cycleCountItem = cycleCountQuery.data?.items.find(hasPropertyValue('uuid', item.uuid));

                const imageUrl = productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url;
                const label = getProductVariantName(productVariant) ?? 'Unknown product';

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
                      <InlineStack gap="200" blockAlign="center">
                        <Badge tone="info">{item.countQuantity.toString()}</Badge>
                        {imageUrl ? <Thumbnail source={imageUrl} alt={label} /> : <SkeletonThumbnail />}
                      </InlineStack>
                    }
                  >
                    <BlockStack gap="200">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="p" variant="bodyMd" fontWeight="bold">
                          {label}
                        </Text>
                      </InlineStack>
                      <InlineStack gap="200" blockAlign="center">
                        <Badge tone={applicationBadge.tone}>{applicationBadge.children}</Badge>
                      </InlineStack>
                      {productVariant?.sku && (
                        <Text as="p" variant="bodyMd" tone="subdued">
                          {productVariant.sku}
                        </Text>
                      )}
                    </BlockStack>
                  </ResourceItem>
                );
              }}
            />
          ) : (
            <>
              <Text as="p" variant="bodyMd" tone="subdued">
                No products added. Add products to begin your cycle count
              </Text>
            </>
          )}

          <Box paddingBlockStart="400">
            <ButtonGroup fullWidth>
              <Button onClick={onImportProducts} disabled={disabled}>
                Import products
              </Button>
              <Button onClick={onScanProducts} disabled={disabled}>
                Scan products
              </Button>
            </ButtonGroup>
          </Box>
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
          cycleCountName={createCycleCount.name}
        />
      )}

      {toast}
    </>
  );
}
