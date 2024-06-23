import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { ToastActionCallable } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { useOrdersQuery } from '@work-orders/common/queries/use-orders-query.js';
import { useState } from 'react';
import { Badge, BlockStack, Filters, InlineStack, Modal, ResourceItem, ResourceList, Text } from '@shopify/polaris';
import { useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { SelectOrderProductModal } from '@web/frontend/components/purchase-orders/modals/SelectOrderProductModal.js';

/**
 * List of orders to select from.
 * Clicking an order will open a modal to select individualw products from that order.
 */
export function AddOrderProductModal({
  open,
  onClose,
  onAdd,
  setToastAction,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (products: CreatePurchaseOrder['lineItems'][number][]) => void;
  setToastAction: ToastActionCallable;
}) {
  const [query, setQuery, optimisticQuery] = useDebouncedState('');
  const [page, setPage] = useState(0);

  const fetch = useAuthenticatedFetch({ setToastAction });
  const currencyFormatter = useCurrencyFormatter({ fetch });

  const ordersQuery = useOrdersQuery({ fetch, params: { query } });
  const orders = ordersQuery.data?.pages?.[page] ?? [];

  const isLastAvailablePage = ordersQuery.data && page === ordersQuery.data.pages.length - 1;
  const hasNextPage = !isLastAvailablePage || ordersQuery.hasNextPage;

  const isLoading = ordersQuery.isLoading;

  const [selectedOrderId, setSelectedOrderId] = useState<ID | null>(null);

  return (
    <>
      <Modal open={open && !selectedOrderId} onClose={onClose} title={'Select Order'}>
        <Modal.Section>
          <Text as={'p'} variant={'bodyMd'}>
            Select an order to add products from
          </Text>
        </Modal.Section>
        <Modal.Section>
          <ResourceList
            filterControl={
              <Filters
                filters={[]}
                queryPlaceholder={'Search orders'}
                queryValue={optimisticQuery}
                onQueryChange={setQuery}
                onQueryClear={() => setQuery('', true)}
                onClearAll={() => setQuery('', true)}
              />
            }
            items={orders}
            resolveItemId={order => order.id}
            resourceName={{ singular: 'order', plural: 'orders' }}
            loading={isLoading}
            pagination={{
              hasNext: hasNextPage,
              hasPrevious: page > 0,
              onPrevious: () => setPage(page => page - 1),
              onNext: () => {
                if (isLastAvailablePage) {
                  ordersQuery.fetchNextPage();
                }

                setPage(page => page + 1);
              },
            }}
            renderItem={order => (
              <ResourceItem
                id={order.id}
                disabled={isLoading}
                onClick={() => {
                  if (isLoading) {
                    return;
                  }

                  setSelectedOrderId(order.id);
                }}
              >
                <BlockStack gap={'200'}>
                  <Text as={'h3'} fontWeight={'semibold'}>
                    {order.name}
                  </Text>
                  <Text as={'p'} tone={'subdued'}>
                    {currencyFormatter(order.total)}
                  </Text>
                  {order.customer && (
                    <Text as={'p'} tone={'subdued'}>
                      {order.customer.displayName}
                    </Text>
                  )}
                  <InlineStack gap={'200'}>
                    {order.workOrders.map(wo => (
                      <Badge key={wo.name} tone={'info'}>
                        {wo.name}
                      </Badge>
                    ))}
                  </InlineStack>
                </BlockStack>
              </ResourceItem>
            )}
          />
        </Modal.Section>
      </Modal>

      {selectedOrderId && (
        <SelectOrderProductModal
          open={!!selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onSelect={products => {
            onAdd(products);
            onClose();
          }}
          orderId={selectedOrderId}
          setToastAction={setToastAction}
        />
      )}
    </>
  );
}
