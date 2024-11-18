import { BlockStack, Button, Card, DataTable, Text, Tooltip } from '@shopify/polaris';
import { WIPCreateStockTransfer } from '@work-orders/common/create-stock-transfer/reducer.js';
import { CreateStockTransferDispatchProxy } from '@work-orders/common/create-stock-transfer/reducer.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useInventoryItemQuery } from '@work-orders/common/queries/use-inventory-item-query.js';

interface Props {
  createStockTransfer: WIPCreateStockTransfer;
  dispatch: CreateStockTransferDispatchProxy;
  disabled?: boolean;
}

export function StockTransferLineItemsCard({ createStockTransfer, dispatch, disabled }: Props) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const canAddItems = !!(createStockTransfer.fromLocationId && createStockTransfer.toLocationId);

  const rows = createStockTransfer.lineItems.map(lineItem => {
    const inventoryItemQuery = useInventoryItemQuery({
      fetch,
      id: lineItem.inventoryItemId,
      locationId: createStockTransfer.fromLocationId,
    });

    const availableQuantity = inventoryItemQuery.data?.inventoryLevel?.quantities.length ?? 0;

    return [
      lineItem.productTitle,
      lineItem.quantity.toString(),
      lineItem.status,
      availableQuantity.toString(),
      <Button disabled={disabled} onClick={() => dispatch.removeLineItems({ lineItems: [lineItem] })}>
        Remove
      </Button>,
    ];
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
          <DataTable
            columnContentTypes={['text', 'numeric', 'text', 'numeric', 'text']}
            headings={['Product', 'Quantity', 'Status', 'Available', 'Actions']}
            rows={rows}
          />

          <Tooltip content={canAddItems ? undefined : 'Select both locations to add items'}>
            <Button
              onClick={() => {
                // TODO: Implement add items modal
                setToastAction({ content: 'Add items functionality to be implemented' });
              }}
              disabled={!canAddItems || disabled}
            >
              Add items
            </Button>
          </Tooltip>
        </BlockStack>
      </Card>
      {toast}
    </>
  );
}
