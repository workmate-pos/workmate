import { reactExtension, useApi, AdminAction, BlockStack, Button, Text } from '@shopify/ui-extensions-react/admin';
import { useOrderQuery } from '@work-orders/common/queries/use-order-query.js';
import { isGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useOrderSyncMutation } from '@work-orders/common/queries/use-order-sync-mutation.js';
import { QueryClientProvider, QueryClient } from '@work-orders/common/queries/react-query.js';

// The target used here must match the target used in the extension's toml file (./shopify.extension.toml)
const TARGET = 'admin.order-details.action.render';

const queryClient = new QueryClient();

export default reactExtension(TARGET, () => (
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
));

function App() {
  const { close, data } = useApi(TARGET);

  const id = data.selected.map(order => order.id).filter(isGid)[0] ?? null;

  const orderQuery = useOrderQuery({ fetch, id });
  const order = orderQuery.data?.order;

  const syncMutation = useOrderSyncMutation({ fetch });

  return (
    // The AdminAction component provides an API for setting the title and actions of the Action extension wrapper.
    <AdminAction loading={orderQuery.isLoading || syncMutation.isLoading}>
      {orderQuery.isError && (
        <BlockStack gap={'base'}>
          <Text fontWeight={'bold'}>{`Failed to fetch order: ${extractErrorMessage(
            orderQuery.error,
            'unknown error',
          )}`}</Text>
        </BlockStack>
      )}

      {order &&
        (order.workOrders.length > 0 ? (
          <BlockStack gap={'base'}>
            <Text fontWeight="bold">
              Order {order.name} is fully synced and associated with work order{' '}
              {order.workOrders.map(workOrder => workOrder.name).join(', ')}.
            </Text>
          </BlockStack>
        ) : (
          <BlockStack gap={'base'}>
            <Text fontWeight="bold">Order {order.name} is not associated with any work order</Text>
            <Button onClick={() => syncMutation.mutate(order.id, { onSuccess: close })}>Sync with WorkMate</Button>

            {syncMutation.isError && (
              <Text fontWeight="bold">{extractErrorMessage(syncMutation.error, 'Failed to sync order')}</Text>
            )}
          </BlockStack>
        ))}
    </AdminAction>
  );
}
