import {
  Badge,
  BlockStack,
  Box,
  EmptyState,
  Filters,
  InlineStack,
  Modal,
  ResourceItem,
  ResourceList,
  Text,
} from '@shopify/polaris';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useSpecialOrdersQuery } from '@work-orders/common/queries/use-special-orders-query.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { DetailedSpecialOrder } from '@web/services/special-orders/types.js';
import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { sum, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { hasNestedPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { useEffect, useState } from 'react';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { getInfiniteQueryPagination } from '@web/frontend/util/pagination.js';
import { v4 as uuid } from 'uuid';
import { UUID } from '@web/util/types.js';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { emptyState } from '@web/frontend/assets/index.js';

export function ImportSpecialOrderModal({
  open,
  onClose,
  locationId,
  vendorName,
  createPurchaseOrder,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  locationId: ID;
  vendorName: string;
  createPurchaseOrder: Pick<CreatePurchaseOrder, 'name' | 'lineItems'>;
  onSelect: (lineItems: CreatePurchaseOrder['lineItems']) => void;
}) {
  const [selectedSpecialOrder, setSelectedSpecialOrder] = useState<DetailedSpecialOrder>();

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const [query, setQuery, optimisticQuery] = useDebouncedState('');

  const customFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'LINE_ITEM' });
  const productVariantIds = unique(createPurchaseOrder.lineItems.map(li => li.productVariantId).filter(isNonNullable));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const specialOrdersQuery = useSpecialOrdersQuery({
    fetch,
    params: {
      query,
      locationId,
      lineItemOrderState: 'NOT_FULLY_ORDERED',
      lineItemVendorName: vendorName,
      limit: 25,
    },
  });

  const getRemainingLineItemQuantity = (
    specialOrder: DetailedSpecialOrder,
    specialOrderLineItem: DetailedSpecialOrder['lineItems'][number],
  ) => {
    if (!specialOrder) {
      return null;
    }

    const currentPurchaseOrderQuantity = sum(
      createPurchaseOrder.lineItems
        .filter(hasNestedPropertyValue('specialOrderLineItem.uuid', specialOrderLineItem.uuid))
        .filter(hasNestedPropertyValue('specialOrderLineItem.name', specialOrder.name))
        .map(lineItem => lineItem.quantity),
    );

    const otherPurchaseOrderQuantity = sum(
      specialOrderLineItem.purchaseOrderLineItems
        .filter(lineItem => lineItem.purchaseOrderName !== createPurchaseOrder.name)
        .map(lineItem => lineItem.quantity),
    );

    return Math.max(0, specialOrderLineItem.quantity - currentPurchaseOrderQuantity - otherPurchaseOrderQuantity);
  };

  const specialOrders = specialOrdersQuery.data?.pages.flat() ?? [];
  const filteredSpecialOrders = specialOrders.filter(
    specialOrder =>
      // We exclude any special orders that have no items with remaining quantity.
      // This cannot be fully computed on the server because the current purchase order can have unsaved line items linked to the special order.
      !specialOrder.lineItems.every(lineItem => {
        const remainingLineItemQuantity = getRemainingLineItemQuantity(specialOrder, lineItem);
        return !remainingLineItemQuantity;
      }),
  );

  const isLoading =
    specialOrdersQuery.isFetching ||
    Object.values(productVariantQueries).some(query => query.isLoading) ||
    customFieldsPresetsQuery.isLoading;

  const productVariantQueryStatuses = Object.values(productVariantQueries).map(query => query.status);

  useEffect(() => {
    if (!selectedSpecialOrder) {
      return;
    }

    if (Object.values(productVariantQueries).some(query => query.isLoading)) {
      return;
    }

    setSelectedSpecialOrder(undefined);
    onClose();

    if (Object.values(productVariantQueries).some(query => query.isError || !query.data)) {
      setToastAction({ content: 'Failed to load product variants, please try again' });
      return;
    }

    if (!customFieldsPresetsQuery.data?.defaultCustomFields) {
      setToastAction({ content: 'Failed to load default custom fields, please try again' });
      return;
    }

    onSelect(
      selectedSpecialOrder.lineItems
        .map(lineItem => {
          const productVariantQuery = productVariantQueries[lineItem.productVariantId];
          const productVariant = productVariantQuery?.data;
          const inventoryItem = productVariant?.inventoryItem;

          if (!inventoryItem) {
            setToastAction({ content: 'Failed to load product variant, please try again' });
            throw new Error('Failed to load product variant');
          }

          const remainingQuantity = getRemainingLineItemQuantity(selectedSpecialOrder, lineItem);

          if (!remainingQuantity) {
            return null;
          }

          return {
            uuid: uuid() as UUID,
            specialOrderLineItem: {
              name: selectedSpecialOrder.name,
              uuid: lineItem.uuid,
            },
            quantity: remainingQuantity,
            unitCost: inventoryItem.unitCost
              ? BigDecimal.fromDecimal(inventoryItem.unitCost.amount).toMoney()
              : BigDecimal.ZERO.toMoney(),
            customFields: customFieldsPresetsQuery.data.defaultCustomFields,
            productVariantId: lineItem.productVariantId,
            availableQuantity: 0,
            serialNumber: null,
          };
        })
        .filter(isNonNullable),
    );
  }, [selectedSpecialOrder, productVariantQueryStatuses.join(', ')]);

  const [pageIndex, setPageIndex] = useState(0);
  const pagination = getInfiniteQueryPagination(pageIndex, setPageIndex, specialOrdersQuery);
  const page = specialOrdersQuery.data?.pages[pageIndex] ?? [];

  return (
    <Modal open={open} title={'Select Special Order'} onClose={onClose}>
      <ResourceList
        filterControl={
          <Filters
            queryPlaceholder="Search special orders"
            queryValue={optimisticQuery}
            onQueryChange={query => setQuery(query, !query)}
            onQueryClear={() => setQuery('', true)}
            onClearAll={() => setQuery('', true)}
            filters={[]}
          />
        }
        items={page}
        emptyState={
          <EmptyState image={emptyState}>
            <Text as="p" variant="bodyMd" fontWeight="bold">
              No special orders available for this location and vendor
            </Text>
          </EmptyState>
        }
        loading={isLoading}
        resolveItemId={item => item.name}
        pagination={{
          hasNext: pagination.hasNextPage,
          onNext: pagination.next,
          hasPrevious: pagination.hasPreviousPage,
          onPrevious: pagination.previous,
        }}
        renderItem={specialOrder => {
          const purchaseOrderNames = specialOrder.purchaseOrders.map(po => po.name);
          const orderNames = specialOrder.orders.map(order => order.name);
          const workOrderNames = specialOrder.workOrders.map(order => order.name);

          return (
            <ResourceItem id={specialOrder.name} onClick={() => setSelectedSpecialOrder(specialOrder)}>
              <Box paddingInline={'400'}>
                <BlockStack gap={'100'}>
                  <BlockStack>
                    <Text as="p" variant="bodyMd" fontWeight="bold">
                      {specialOrder.name}
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      {specialOrder.customer.displayName}
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      {specialOrder.location.name}
                    </Text>
                  </BlockStack>
                  <InlineStack gap={'200'}>
                    {[...workOrderNames, ...orderNames, ...purchaseOrderNames].map(name => (
                      <Badge key={name} tone="info">
                        {name}
                      </Badge>
                    ))}
                  </InlineStack>
                </BlockStack>
              </Box>
            </ResourceItem>
          );
        }}
      />
    </Modal>
  );
}
