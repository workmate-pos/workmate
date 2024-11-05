import {
  Badge,
  BlockStack,
  Box,
  Button,
  Collapsible,
  Icon,
  InlineStack,
  Modal,
  ResourceItem,
  ResourceList,
  SkeletonDisplayText,
  SkeletonThumbnail,
  Text,
  Thumbnail,
} from '@shopify/polaris';
import { getUnsourcedWorkOrderItems } from '@web/frontend/components/work-orders/components/UnsourcedItemList.js';
import { ToastActionCallable, useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import {
  StockTransferLocationItem,
  useTransferOrderLocationItems,
} from '@work-orders/common/queries/use-transfer-order-location-items.js';
import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useId, useState } from 'react';
import { CaretUpMinor } from '@shopify/polaris-icons';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useInventoryItemQueries } from '@work-orders/common/queries/use-inventory-item-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useStockTransferMutation } from '@work-orders/common/queries/use-stock-transfer-mutation.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useWorkOrderQueries } from '@web/frontend/components/work-orders/modals/WorkOrderSourcingModal.js';

export function WorkOrderSourcingTransferOrderModal({
  name,
  open,
  onClose,
}: {
  name: string;
  open: boolean;
  onClose: () => void;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const { workOrderQuery, productVariantQueries } = useWorkOrderQueries(fetch, name);

  const workOrder = workOrderQuery.data?.workOrder;
  const productVariants = Object.values(productVariantQueries)
    .map(query => query.data)
    .filter(isNonNullable);

  const { isLoading, locations } = useTransferOrderLocationItems(
    fetch,
    workOrder?.locationId ?? createGid('Location', '0'),
    !workOrder
      ? []
      : getUnsourcedWorkOrderItems(workOrder, { includeAvailable: false }, productVariants).map(item => ({
          ...item,
          quantity: item.unsourcedQuantity,
        })),
  );

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Transfer Order"
        loading={
          workOrderQuery.isLoading || Object.values(productVariantQueries).some(query => query.isLoading) || isLoading
        }
      >
        <ResourceList
          items={locations}
          resourceName={{ singular: 'location', plural: 'locations' }}
          emptyState={
            <Box paddingBlock={'800'} paddingInline={'400'}>
              <BlockStack align="center" inlineAlign="center">
                <Text as="p" variant="bodyMd" fontWeight="bold">
                  No locations with stock available for transfer
                </Text>
              </BlockStack>
            </Box>
          }
          renderItem={location => (
            <LocationResourceItem
              setToastAction={setToastAction}
              location={location}
              toLocationId={workOrder?.locationId}
              onClose={onClose}
            />
          )}
        />
      </Modal>

      {toast}
    </>
  );
}

function LocationResourceItem({
  location,
  toLocationId,
  onClose,
  setToastAction,
}: {
  location: StockTransferLocationItem;
  toLocationId?: ID | null | undefined;
  onClose: () => void;
  setToastAction: ToastActionCallable;
}) {
  const fetch = useAuthenticatedFetch({ setToastAction });

  const id = useId();
  const [open, setOpen] = useState(false);

  const inventoryItemIds = unique(location.stockTransferLineItems.map(li => li.inventoryItemId));
  const inventoryItemQueries = useInventoryItemQueries({ fetch, ids: inventoryItemIds, locationId: location.id });

  const transferOrderMutation = useStockTransferMutation({ fetch });

  return (
    <ResourceItem id={location.id} onClick={() => setOpen(!open)}>
      <BlockStack gap={'400'}>
        <InlineStack align="space-between" gap={'200'} blockAlign="center">
          <BlockStack gap={'050'}>
            <Text as="p" variant="bodyMd" fontWeight="bold">
              {location.name}
            </Text>

            <Text as="p" variant="bodySm" tone="subdued">
              {location.availableQuantity} quantity available for transfer
            </Text>
          </BlockStack>

          <span
            style={{
              transform: open ? 'rotate(180deg)' : undefined,
              transition: 'all 0.2s ease-in-out',
            }}
            onClick={() => setOpen(current => !current)}
          >
            <Icon source={CaretUpMinor} tone={'subdued'} />
          </span>
        </InlineStack>

        <Collapsible id={id} open={open}>
          <BlockStack gap={'400'}>
            <InlineStack gap={'050'} blockAlign="center">
              {location.stockTransferLineItems.map(item => {
                const inventoryItem = inventoryItemQueries[item.inventoryItemId]?.data;
                const productVariant = inventoryItem?.variant;

                const imageUrl = productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url;
                const label = getProductVariantName(productVariant) ?? 'Unknown product';

                return (
                  <InlineStack gap={'200'} wrap={false}>
                    <Badge tone="info-strong">{String(item.quantity.toString())}</Badge>
                    {imageUrl && <Thumbnail source={imageUrl} alt={label} size="small" />}
                    {!imageUrl && <SkeletonThumbnail size="small" />}
                    <BlockStack gap={'200'}>
                      {!inventoryItem && <SkeletonDisplayText />}
                      {!!inventoryItem && (
                        <Text as="p" variant="bodyMd" fontWeight="bold">
                          {label}
                        </Text>
                      )}
                    </BlockStack>
                  </InlineStack>
                );
              })}
            </InlineStack>

            <span onClick={event => event.stopPropagation()} style={{ width: '100%' }}>
              <Button
                variant="primary"
                loading={transferOrderMutation.isPending}
                onClick={() => {
                  if (!toLocationId) {
                    setToastAction({ content: 'Work order location is not set' });
                    return;
                  }

                  return transferOrderMutation.mutate(
                    {
                      name: null,
                      fromLocationId: location.id,
                      toLocationId,
                      note: '',
                      lineItems: location.stockTransferLineItems,
                    },
                    {
                      onSuccess() {
                        // TODO: Redirect to transfer order in future (no Admin UI currently)
                        setToastAction({ content: 'Transfer order created!' });
                        onClose();
                      },
                    },
                  );
                }}
              >
                Create Transfer Order
              </Button>
            </span>
          </BlockStack>
        </Collapsible>
      </BlockStack>
    </ResourceItem>
  );
}
