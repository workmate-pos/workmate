import { Badge, Button, ScrollView, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { match } from 'ts-pattern';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { getWorkOrderItemFulfillmentBadges } from './WorkOrderItemSourcing.js';
import { SECOND_IN_MS } from '@work-orders/common/time/constants.js';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { createGid, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useInventoryItemQuery } from '@work-orders/common/queries/use-inventory-item-query.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { useForm } from '@teifi-digital/pos-tools/form';
import { useCreateWorkOrderOrderMutation } from '@work-orders/common/queries/use-create-work-order-order-mutation.js';
import { useStockTransferMutation } from '@work-orders/common/queries/use-stock-transfer-mutation.js';
import { usePurchaseOrderMutation } from '@work-orders/common/queries/use-purchase-order-mutation.js';
import { FormButton } from '@teifi-digital/pos-tools/form/components/FormButton.js';

// TODO: Also show the current location inventory #, and then make it possible to config SO/PO/TO
export function WorkOrderItemSourcingItem({ workOrderName, uuid }: { uuid: string; workOrderName: string }) {
  const { session } = useExtensionApi<'pos.home.modal.render'>();
  const fetch = useAuthenticatedFetch();
  const workOrderQuery = useWorkOrderQuery({ fetch, name: workOrderName }, { staleTime: 10 * SECOND_IN_MS });
  const workOrderItem = workOrderQuery.data?.workOrder?.items.find(item => item.uuid === uuid);
  const productVariantId = match(workOrderItem)
    .with({ type: 'product' }, item => item.productVariantId)
    .otherwise(() => null);

  const productVariantQuery = useProductVariantQuery({ fetch, id: productVariantId });
  const inventoryItemId = productVariantQuery.data?.inventoryItem.id;
  const inventoryItemQuery = useInventoryItemQuery(
    { fetch, id: inventoryItemId!, locationId: createGid('Location', session.currentSession.locationId) },
    { enabled: !!inventoryItemId },
  );

  const name = match(workOrderItem)
    .with({ type: 'product' }, item => {
      if (productVariantQuery.isLoading) {
        return 'Loading...';
      }

      if (productVariantQuery.isError) {
        return 'Error loading product';
      }

      const productVariant = productVariantQuery.data;
      return getProductVariantName(productVariant) ?? 'Unknown product';
    })
    .with({ type: 'custom-item' }, item => item.name)
    .otherwise(() => '');

  const screen = useScreen();
  screen.setIsLoading(workOrderQuery.isFetching || productVariantQuery.isFetching || inventoryItemQuery.isFetching);
  screen.setTitle(name);

  const createWorkOrderOrderMutation = useCreateWorkOrderOrderMutation({ fetch });
  const createTransferOrderMutation = useStockTransferMutation({ fetch });
  const createPurchaseOrderMutation = usePurchaseOrderMutation({ fetch });

  const { Form } = useForm();
  const isLoadingForm =
    createWorkOrderOrderMutation.isLoading ||
    createTransferOrderMutation.isLoading ||
    createPurchaseOrderMutation.isLoading;

  if (!workOrderItem) {
    return (
      <ScrollView>
        <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextCritical" variant="body">
            Item not found
          </Text>
        </ResponsiveStack>
      </ScrollView>
    );
  }

  if (workOrderQuery.isError) {
    return (
      <ScrollView>
        <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextCritical" variant="body">
            {extractErrorMessage(workOrderQuery.error, 'An error occurred while loading work order')}
          </Text>
        </ResponsiveStack>
      </ScrollView>
    );
  }

  if (!workOrderQuery.data?.workOrder) {
    return null;
  }

  if (productVariantQuery.isError) {
    return (
      <ScrollView>
        <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextCritical" variant="body">
            {extractErrorMessage(productVariantQuery.error, 'An error occurred while loading product')}
          </Text>
        </ResponsiveStack>
      </ScrollView>
    );
  }

  if (!productVariantQuery.data) {
    return null;
  }

  if (inventoryItemQuery.isError) {
    return (
      <ScrollView>
        <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextCritical" variant="body">
            {extractErrorMessage(inventoryItemQuery.error, 'An error occurred while loading inventory item')}
          </Text>
        </ResponsiveStack>
      </ScrollView>
    );
  }

  if (!inventoryItemQuery.data) {
    return null;
  }

  // TODO: Ability to create a purchase order / transfer order / shopify order
  // TODO: Make this all async - i.e. have the option in the list to create everything & show a plan

  const availableInventoryCount = inventoryItemQuery.data.inventoryLevel?.quantities.find(
    hasPropertyValue('name', 'available'),
  )?.quantity;

  // TODO: Create a SO for many items at once - maybe have the 3 buttons from the main screen along with options when selecting

  // only one shopify order is currently allowed per work order item
  const hasShopifyOrder =
    workOrderItem.shopifyOrderLineItem?.orderId &&
    parseGid(workOrderItem.shopifyOrderLineItem.orderId).objectName === 'Order';

  return (
    <ScrollView>
      <Form disabled={isLoadingForm}>
        <ResponsiveStack direction={'vertical'} paddingVertical={'Medium'} spacing={1}>
          <Text variant={'headingLarge'}>{name}</Text>
          <Text variant={'bodyMd'} color={'TextSubdued'}>
            {typeof availableInventoryCount === 'number'
              ? `${availableInventoryCount} available at current location`
              : ''}
          </Text>
          <ResponsiveStack direction={'horizontal'} spacing={1} flexWrap={'wrap'}>
            {getWorkOrderItemFulfillmentBadges(workOrderItem).map(props => (
              <Badge {...props} />
            ))}
          </ResponsiveStack>
        </ResponsiveStack>
      </Form>
    </ScrollView>
  );
}
