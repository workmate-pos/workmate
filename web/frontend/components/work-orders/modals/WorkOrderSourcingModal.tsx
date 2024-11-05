import {
  Badge,
  BadgeProps,
  Banner,
  BlockStack,
  InlineStack,
  Modal,
  ResourceItem,
  ResourceList,
  Text,
  Thumbnail,
} from '@shopify/polaris';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';
import { sum, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { hasNonNullableProperty, hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { useInventoryItemQueries } from '@work-orders/common/queries/use-inventory-item-query.js';
import { createGid, ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { Fetch } from '@work-orders/common/queries/fetch.js';
import { getProductServiceType } from '@work-orders/common/metafields/product-service-type.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import {
  DetailedWorkOrder,
  DetailedWorkOrderItem,
  LineItemReservation,
  WorkOrderPurchaseOrder,
  WorkOrderSpecialOrder,
  WorkOrderTransferOrder,
} from '@web/services/work-orders/types.js';
import { ReactNode, useState } from 'react';
import { SECOND_IN_MS } from '@work-orders/common/time/constants.js';
import { WorkOrderSourcingReserveModal } from '@web/frontend/components/work-orders/modals/WorkOrderSourcingReserveModal.js';
import { getUnsourcedWorkOrderItems } from '@web/frontend/components/work-orders/components/UnsourcedItemList.js';
import { WorkOrderSourcingTransferOrderModal } from '@web/frontend/components/work-orders/modals/WorkOrderSourcingTransferOrderModal.js';
import { WorkOrderSourcingSpecialOrderModal } from '@web/frontend/components/work-orders/modals/WorkOrderSourcingSpecialOrderModal.js';

export function WorkOrderSourcingModal({ name, open, onClose }: { name: string; open: boolean; onClose: () => void }) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const { workOrderQuery, productVariantQueries, inventoryItemQueries } = useWorkOrderQueries(fetch, name);

  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [isTransferOrderModalOpen, setIsTransferOrderModalOpen] = useState(false);
  const [isSpecialOrderModalOpen, setIsSpecialOrderModalOpen] = useState(false);

  const workOrder = workOrderQuery.data?.workOrder;
  const productVariants = Object.values(productVariantQueries)
    .map(query => query.data)
    .filter(isNonNullable);

  const canReserve =
    !workOrder || !workOrder.locationId
      ? false
      : getUnsourcedWorkOrderItems(workOrder, { includeAvailable: false }, productVariants)
          .map(item => item.unsourcedQuantity)
          .reduce((a, b) => a + b, 0) > 0;

  const canTransfer =
    !workOrder || !workOrder.locationId
      ? false
      : getUnsourcedWorkOrderItems(workOrder, { includeAvailable: false }, productVariants)
          .map(item => item.unsourcedQuantity)
          .reduce((a, b) => a + b, 0) > 0;

  const canSpecialOrder = canTransfer;

  return (
    <>
      <Modal
        open={open && !isReserveModalOpen && !isTransferOrderModalOpen && !isSpecialOrderModalOpen}
        onClose={onClose}
        title={'Sourcing'}
        loading={workOrderQuery.isFetching}
        secondaryActions={[
          { content: 'Reserve', disabled: !canReserve, onAction: () => setIsReserveModalOpen(true) },
          { content: 'Transfer Order', disabled: !canTransfer, onAction: () => setIsTransferOrderModalOpen(true) },
          { content: 'Special Order', disabled: !canSpecialOrder, onAction: () => setIsSpecialOrderModalOpen(true) },
        ]}
      >
        <Modal.Section>
          <Text as="p" variant="bodyMd" tone="subdued">
            Control line item inventory sourcing by creating special orders, transfer orders, and by committing
            inventory to this work order.
          </Text>
        </Modal.Section>

        {workOrderQuery.isError && (
          <Modal.Section>
            <Banner
              title="Error loading work order"
              tone="critical"
              action={{
                content: 'Retry',
                onAction: () => workOrderQuery.refetch(),
              }}
            >
              {extractErrorMessage(workOrderQuery.error, 'An error occurred while loading work order')}
            </Banner>
          </Modal.Section>
        )}

        {Object.values(productVariantQueries).some(query => query.isError) && (
          <Modal.Section>
            <Banner
              title="Error loading product"
              tone="critical"
              action={{
                content: 'Retry',
                onAction: () => Object.values(productVariantQueries).forEach(query => query.refetch()),
              }}
            >
              {extractErrorMessage(
                Object.values(productVariantQueries).find(query => query.isError)?.error,
                'An error occurred while loading product',
              )}
            </Banner>
          </Modal.Section>
        )}

        {Object.values(inventoryItemQueries).some(query => query.isError) && (
          <Modal.Section>
            <Banner
              title="Error loading inventory item"
              tone="critical"
              action={{
                content: 'Retry',
                onAction: () => Object.values(inventoryItemQueries).forEach(query => query.refetch()),
              }}
            >
              {extractErrorMessage(
                Object.values(inventoryItemQueries).find(query => query.isError)?.error,
                'An error occurred while loading inventory item',
              )}
            </Banner>
          </Modal.Section>
        )}

        {workOrderQuery.data?.workOrder && (
          <ResourceList
            items={
              workOrderQuery.data.workOrder.items.filter(hasPropertyValue('type', 'product')).filter(item => {
                const productVariantQuery = productVariantQueries[item.productVariantId];
                const productVariant = productVariantQuery?.data;

                const serviceType = getProductServiceType(productVariant?.product.serviceType?.value);

                if (serviceType !== null) {
                  return false;
                }

                return true;
              }) ?? []
            }
            renderItem={item => {
              const productVariantQuery = productVariantQueries[item.productVariantId];
              const productVariant = productVariantQuery?.data;

              const availableInventoryCount = (() => {
                if (!productVariant) {
                  return null;
                }

                const inventoryItemId = productVariant.inventoryItem.id;
                const inventoryItemQuery = inventoryItemQueries[inventoryItemId];
                const inventoryItem = inventoryItemQuery?.data;

                if (!inventoryItem) {
                  return null;
                }

                return inventoryItem.inventoryLevel?.quantities.find(hasPropertyValue('name', 'available'))?.quantity;
              })();

              const imageUrl = productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url;
              const name = productVariant
                ? (getProductVariantName(productVariant) ?? '')
                : productVariantQuery?.isLoading
                  ? 'Loading...'
                  : productVariantQuery?.isError
                    ? 'Error loading product'
                    : 'Unknown product';

              return (
                <ResourceItem id={item.uuid} onClick={() => {}}>
                  <BlockStack gap={'200'}>
                    <InlineStack align={'space-between'} blockAlign={'center'}>
                      <InlineStack gap={'400'}>
                        <Badge tone="info-strong">{item.quantity.toString()}</Badge>
                        {imageUrl && <Thumbnail alt={name} source={imageUrl} />}
                      </InlineStack>
                    </InlineStack>
                    <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
                      {name}
                    </Text>
                    <InlineStack gap="100">
                      {getWorkOrderItemSourcingBadges(workOrderQuery.data.workOrder!, item, {
                        includeOrderBadge: true,
                        includeStatusBadge: true,
                      })}
                    </InlineStack>
                    {typeof availableInventoryCount === 'number' && (
                      <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
                        {availableInventoryCount} available at current location
                      </Text>
                    )}
                    <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
                      {productVariant?.sku}
                    </Text>
                  </BlockStack>
                </ResourceItem>
              );
            }}
          />
        )}
      </Modal>

      <WorkOrderSourcingReserveModal
        name={name}
        open={isReserveModalOpen}
        onClose={() => setIsReserveModalOpen(false)}
      />

      <WorkOrderSourcingTransferOrderModal
        name={name}
        open={isTransferOrderModalOpen}
        onClose={() => setIsTransferOrderModalOpen(false)}
      />

      <WorkOrderSourcingSpecialOrderModal
        name={name}
        open={isSpecialOrderModalOpen}
        onClose={() => setIsSpecialOrderModalOpen(false)}
      />

      {toast}
    </>
  );
}

type CreateBadgeOptions = {
  content: string;
  tone: BadgeProps['tone'];
};

function createBadge({ content, tone }: CreateBadgeOptions): ReactNode {
  return <Badge tone={tone}>{content}</Badge>;
}

export function useWorkOrderQueries(fetch: Fetch, name: string | null) {
  const workOrderQuery = useWorkOrderQuery({ fetch, name }, { staleTime: 10 * SECOND_IN_MS });

  const productVariantIds = unique(
    workOrderQuery.data?.workOrder?.items
      .filter(hasPropertyValue('type', 'product'))
      .map(item => item.productVariantId) ?? [],
  );
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const inventoryItemIds = unique(
    Object.values(productVariantQueries)
      .filter(hasNonNullableProperty('data'))
      .map(query => query.data.inventoryItem.id),
  );
  const inventoryItemQueries = useInventoryItemQueries({
    fetch,
    ids: inventoryItemIds,
    locationId: workOrderQuery.data?.workOrder?.locationId ?? createGid('Location', '0'),
  });

  return {
    workOrderQuery,
    productVariantQueries,
    inventoryItemQueries,
  };
}

// TODO: Shared-ui

function getWorkOrderItemSourcingBadges(
  workOrder: DetailedWorkOrder,
  item: DetailedWorkOrderItem,
  options?: {
    includeOrderBadge?: boolean;
    includeStatusBadge?: boolean;
  },
): ReactNode[] {
  const totalSourced = getWorkOrderItemSourcedCount(item, { includeAvailable: true });
  const totalSourcedExcludingAvailable = getWorkOrderItemSourcedCount(item, { includeAvailable: false });

  const sourcedAllItemsBadge =
    options?.includeStatusBadge && totalSourced >= item.quantity
      ? totalSourcedExcludingAvailable >= item.quantity
        ? createBadge({ content: 'Sourced all items', tone: 'success' })
        : createBadge({
            content: `Sourced all items (${totalSourced - totalSourcedExcludingAvailable} unreserved)`,
            tone: 'success',
          })
      : undefined;
  const requiresSourcingBadge =
    options?.includeStatusBadge && totalSourced < item.quantity && !isOrderId(item.shopifyOrderLineItem?.orderId)
      ? createBadge({ content: 'Requires sourcing', tone: 'critical' })
      : undefined;

  const orderBadge =
    options?.includeOrderBadge && isOrderId(item.shopifyOrderLineItem?.orderId)
      ? createBadge({
          content:
            workOrder.orders.find(hasPropertyValue('id', item.shopifyOrderLineItem.orderId))?.name ?? 'Unknown order',
          tone: 'success',
        })
      : undefined;

  const layawayBadges = item.reservations.map(reservation => getReservationBadge(reservation, true));
  const transferOrderBadges = item.transferOrders.map(to => getTransferOrderBadge(to, true));
  const specialOrderBadges = item.specialOrders.map(so => getSpecialOrderBadge(so, true));
  const purchaseOrderBadges = item.purchaseOrders.map(po => getPurchaseOrderBadge(po, true));

  return [
    orderBadge,
    sourcedAllItemsBadge,
    requiresSourcingBadge,
    ...layawayBadges,
    ...transferOrderBadges,
    ...specialOrderBadges,
    ...purchaseOrderBadges,
  ].filter(isNonNullable);
}

export function getWorkOrderItemSourcedCount(
  item: Pick<
    DetailedWorkOrderItem,
    'quantity' | 'specialOrders' | 'transferOrders' | 'reservations' | 'availableInventoryQuantity'
  >,
  { includeAvailable }: { includeAvailable: boolean },
) {
  return Math.min(
    item.quantity,
    sum([
      includeAvailable ? item.availableInventoryQuantity : 0,
      ...item.specialOrders.flatMap(po => po.items).map(item => item.quantity),
      ...item.transferOrders.flatMap(to => to.items).map(item => item.quantity),
      ...item.reservations.map(reservation => reservation.quantity),
    ]),
  );
}

function isOrderId(id: string | null | undefined): id is ID {
  return !!id && parseGid(id).objectName === 'Order';
}

export function getPurchaseOrderBadge(purchaseOrder: WorkOrderPurchaseOrder, includeQuantity: boolean) {
  const availableQuantity = sum(purchaseOrder.items.map(item => item.availableQuantity));
  const quantity = sum(purchaseOrder.items.map(item => item.quantity));
  const tone = availableQuantity === quantity ? 'success' : 'warning';

  let content = purchaseOrder.name;

  if (includeQuantity) {
    content = `${content} • ${availableQuantity}/${quantity}`;
  }

  return createBadge({ content, tone });
}

export function getSpecialOrderBadge(specialOrder: WorkOrderSpecialOrder, includeQuantity: boolean) {
  const { name, items } = specialOrder;

  if (!includeQuantity) {
    return createBadge({ content: name, tone: 'info' });
  }

  let tone: BadgeProps['tone'] = 'success';

  if (items.some(item => item.quantity > item.orderedQuantity)) {
    tone = 'warning';
  }

  let content = name;

  const totalQuantity = sum(items.map(item => item.quantity));
  const totalOrderedQuantity = sum(items.map(item => item.orderedQuantity));

  if (includeQuantity) {
    content = `${content} • ${totalOrderedQuantity}/${totalQuantity}`;
  }

  return createBadge({ content, tone });
}

export function getTransferOrderBadge(transferOrder: WorkOrderTransferOrder, includeQuantity: boolean) {
  const { name, items } = transferOrder;

  let tone: BadgeProps['tone'] = 'success';

  if (items.some(item => item.status === 'PENDING')) {
    tone = 'warning';
  }

  if (items.some(item => item.status === 'IN_TRANSIT')) {
    tone = 'info';
  }

  let content = name;

  const receivedTransferOrderItemCount = sum(
    transferOrder.items
      .filter(item => item.status === 'RECEIVED' || item.status === 'REJECTED')
      .map(item => item.quantity),
  );
  const transferOrderItemCount = sum(transferOrder.items.map(item => item.quantity));

  if (includeQuantity) {
    content = `${content} • ${receivedTransferOrderItemCount}/${transferOrderItemCount}`;
  }

  return createBadge({ tone, content });
}

export function getReservationBadge(reservation: Pick<LineItemReservation, 'quantity'>, includeQuantity: boolean) {
  const { quantity } = reservation;

  let content = 'Reserved';

  if (includeQuantity) {
    content = `${content} • ${quantity}`;
  }

  return createBadge({ content, tone: 'success' });
}
