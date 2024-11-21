import {
  BlockStack,
  Button,
  Card,
  ResourceList,
  Text,
  Tooltip,
  Badge,
  Thumbnail,
  InlineStack,
  SkeletonThumbnail,
  ButtonGroup,
} from '@shopify/polaris';
import { WIPCreateStockTransfer } from '@work-orders/common/create-stock-transfer/reducer.js';
import { CreateStockTransferDispatchProxy } from '@work-orders/common/create-stock-transfer/reducer.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useInventoryItemQueries } from '@work-orders/common/queries/use-inventory-item-query.js';
import { useState } from 'react';
import { AddStockTransferItemsModal } from './modals/AddStockTransferItemsModal.js';
import { StockTransferLineItemConfigModal } from './modals/StockTransferLineItemConfigModal.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { StockTransferLineItem } from '@web/schemas/generated/create-stock-transfer.js';
import { getStockTransferLineItemStatusBadgeProps } from '@work-orders/common/create-stock-transfer/get-stock-transfer-line-item-status-badge-props.js';

type Props = {
  createStockTransfer: WIPCreateStockTransfer;
  dispatch: CreateStockTransferDispatchProxy;
  disabled?: boolean;
};

export function StockTransferLineItemsCard({ createStockTransfer, dispatch, disabled }: Props) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const [isAddItemsModalOpen, setIsAddItemsModalOpen] = useState(false);
  const [selectedLineItem, setSelectedLineItem] = useState<StockTransferLineItem | null>(null);

  const canAddItems = !!(createStockTransfer.fromLocationId && createStockTransfer.toLocationId);
  const inventoryItemIds = unique(createStockTransfer.lineItems.map(lineItem => lineItem.inventoryItemId));

  const inventoryItemQueries = useInventoryItemQueries({
    fetch,
    ids: inventoryItemIds,
    locationId: createStockTransfer.fromLocationId,
  });

  return (
    <>
      <Card>
        <BlockStack gap="400">
          <BlockStack gap="200">
            <Text variant="headingMd" as="h2">
              Line Items
            </Text>
            <Text tone="subdued" as="p">
              Add items to transfer between locations
            </Text>
          </BlockStack>

          <ResourceList
            items={createStockTransfer.lineItems}
            renderItem={lineItem => {
              const inventoryItem = inventoryItemQueries[lineItem.inventoryItemId]?.data;
              const availableQuantity =
                inventoryItem?.inventoryLevel?.quantities.find(q => q.name === 'available')?.quantity ?? 0;

              const hasOnlyDefaultVariant = inventoryItem?.variant?.product?.hasOnlyDefaultVariant ?? true;
              const imageUrl =
                inventoryItem?.variant?.image?.url ?? inventoryItem?.variant?.product?.featuredImage?.url;

              const statusBadgeProps = getStockTransferLineItemStatusBadgeProps({ status: lineItem.status });

              return (
                <ResourceList.Item
                  id={lineItem.uuid}
                  onClick={() => setSelectedLineItem(lineItem)}
                  media={
                    <InlineStack gap="200" blockAlign="center">
                      <Badge tone={'info'}>{`${lineItem.quantity}/${availableQuantity}`}</Badge>
                      {imageUrl ? (
                        <Thumbnail source={imageUrl ?? ''} alt={lineItem.productTitle} />
                      ) : (
                        <SkeletonThumbnail />
                      )}
                    </InlineStack>
                  }
                >
                  <BlockStack gap="200">
                    <Text variant="bodyMd" fontWeight="bold" as="h3">
                      {getProductVariantName({
                        title: lineItem.productVariantTitle,
                        product: {
                          title: lineItem.productTitle,
                          hasOnlyDefaultVariant,
                        },
                      })}
                    </Text>
                    <InlineStack>
                      <Badge tone={statusBadgeProps.tone}>{statusBadgeProps.children}</Badge>
                    </InlineStack>
                  </BlockStack>
                </ResourceList.Item>
              );
            }}
          />

          <Tooltip content={canAddItems ? undefined : 'Select both locations to add items'}>
            <ButtonGroup fullWidth>
              <Button onClick={() => setIsAddItemsModalOpen(true)} disabled={!canAddItems || disabled}>
                Add items
              </Button>
            </ButtonGroup>
          </Tooltip>
        </BlockStack>
      </Card>

      <AddStockTransferItemsModal
        open={isAddItemsModalOpen}
        onClose={() => setIsAddItemsModalOpen(false)}
        createStockTransfer={createStockTransfer}
        dispatch={dispatch}
      />

      <StockTransferLineItemConfigModal
        open={selectedLineItem !== null}
        onClose={() => setSelectedLineItem(null)}
        lineItem={selectedLineItem}
        fromLocationId={createStockTransfer.fromLocationId}
        toLocationId={createStockTransfer.toLocationId}
        dispatch={dispatch}
      />

      {toast}
    </>
  );
}
