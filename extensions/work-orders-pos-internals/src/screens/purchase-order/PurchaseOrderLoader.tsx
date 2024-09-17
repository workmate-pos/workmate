import { useScreen } from '@teifi-digital/pos-tools/router';
import { PurchaseOrder } from '../PurchaseOrder.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { Text } from '@shopify/ui-extensions-react/point-of-sale';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { usePurchaseOrderQuery } from '@work-orders/common/queries/use-purchase-order-query.js';
import { createPurchaseOrderFromPurchaseOrder } from '@work-orders/common/create-purchase-order/from-purchase-order.js';

export function PurchaseOrderLoader({ name }: { name: string }) {
  const fetch = useAuthenticatedFetch();
  const purchaseOrderQuery = usePurchaseOrderQuery({ fetch, name });

  const screen = useScreen();
  screen.setIsLoading(purchaseOrderQuery.isFetching);

  if (purchaseOrderQuery.isLoading) {
    return null;
  }

  if (purchaseOrderQuery.isError) {
    return (
      <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          Could not load purchase order: {extractErrorMessage(purchaseOrderQuery.error, 'unknown error')}
        </Text>
      </ResponsiveStack>
    );
  }

  if (!purchaseOrderQuery.data) {
    return (
      <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          Purchase order not found
        </Text>
      </ResponsiveStack>
    );
  }

  return <PurchaseOrder initial={createPurchaseOrderFromPurchaseOrder(purchaseOrderQuery.data)} />;
}
