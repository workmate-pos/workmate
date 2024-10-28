import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { ScrollView, Stack, Text, useApi } from '@shopify/ui-extensions-react/point-of-sale';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { useRouter } from '../../routes.js';
import { UnsourcedWorkOrderItem } from './WorkOrderItemSourcing.js';
import { defaultCreateStockTransfer } from '../../create-stock-transfer/default.js';
import { ListPopup, ListPopupItem } from '@work-orders/common-pos/screens/ListPopup.js';
import { useTransferOrderLocationItems } from '@work-orders/common/queries/use-transfer-order-location-items.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useScreen } from '@teifi-digital/pos-tools/router';

/**
 * Select a transfer order location given a list of items that should be transferred.
 * Will display all locations, along with the total quantity among all products that can be transferred from that location.
 * Will show locations in order of most to least items.
 */
export function CreateTransferOrderForLocation({
  toLocationId,
  products,
}: {
  toLocationId: ID;
  products: UnsourcedWorkOrderItem[];
}) {
  const fetch = useAuthenticatedFetch();

  const { isLoading, locations } = useTransferOrderLocationItems(
    fetch,
    toLocationId,
    products.map(product => ({
      ...product,
      quantity: product.unsourcedQuantity,
    })),
  );

  const screen = useScreen();
  screen.setIsLoading(isLoading);

  const { toast } = useApi<'pos.home.modal.render'>();
  const router = useRouter();

  if (products.length === 0) {
    return (
      <ScrollView>
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextCritical" variant="body">
            No products selected
          </Text>
        </Stack>
      </ScrollView>
    );
  }

  return (
    <>
      <ListPopup
        title="Select Transfer Order Location"
        selection={{
          type: 'select',
          items: locations.map<ListPopupItem<ID>>(location => ({
            id: location.id,
            leftSide: {
              label: location.name,
              subtitle: [`Can transfer ${location.availableQuantity} products`],
            },
          })),
          onSelect: async fromLocationId => {
            const fromLocation = locations.find(hasPropertyValue('id', fromLocationId));

            if (!fromLocation) {
              toast.show('Selected item not found');
              return;
            }

            await router.popCurrent();
            router.push('StockTransfer', {
              initial: {
                ...defaultCreateStockTransfer,
                lineItems: fromLocation.stockTransferLineItems,
                fromLocationId,
                toLocationId,
              },
            });
          },
        }}
        emptyState={
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              Found no locations with inventory available for transfer
            </Text>
          </Stack>
        }
        useRouter={useRouter}
      />
    </>
  );
}
