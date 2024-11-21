import { Modal, BlockStack, Select, TextField, Button, Text } from '@shopify/polaris';
import { CreateStockTransferDispatchProxy } from '@work-orders/common/create-stock-transfer/reducer.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useInventoryItemQuery } from '@work-orders/common/queries/use-inventory-item-query.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useState } from 'react';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { StockTransferLineItem } from '@web/schemas/generated/create-stock-transfer.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useToast } from '@teifi-digital/shopify-app-react';

type Props = {
  open: boolean;
  onClose: () => void;
  lineItem: StockTransferLineItem | null;
  fromLocationId: ID | null;
  toLocationId: ID | null;
  dispatch: CreateStockTransferDispatchProxy;
};

export function StockTransferLineItemConfigModal({
  open,
  onClose,
  lineItem,
  fromLocationId,
  toLocationId,
  dispatch,
}: Props) {
  const [toast, setToastAction] = useToast();
  const [updatedLineItem, setUpdatedLineItem] = useState<StockTransferLineItem | null>(lineItem);
  const fetch = useAuthenticatedFetch({ setToastAction });

  const fromLocationQuery = useLocationQuery({ fetch, id: fromLocationId });
  const toLocationQuery = useLocationQuery({ fetch, id: toLocationId });

  const fromInventoryItemQuery = useInventoryItemQuery({
    fetch,
    id: lineItem?.inventoryItemId ?? null,
    locationId: fromLocationId,
  });

  if (!lineItem || !updatedLineItem) return null;

  const handleSave = () => {
    if (updatedLineItem) {
      dispatch.updateLineItems({ lineItems: [updatedLineItem] });
      onClose();
    }
  };

  const handleRemove = () => {
    dispatch.removeLineItems({ lineItems: [lineItem] });
    onClose();
  };

  const availableQuantity =
    fromInventoryItemQuery.data?.inventoryLevel?.quantities.find(q => q.name === 'available')?.quantity ?? 0;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={getProductVariantName({
          title: lineItem.productVariantTitle,
          product: {
            title: lineItem.productTitle,
            hasOnlyDefaultVariant: true,
          },
        })}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <BlockStack gap="400">
              <Text variant="bodyMd" as="span">
                From: {fromLocationQuery.data?.name}
              </Text>
              <Text variant="bodyMd" as="span">
                Available: {availableQuantity}
              </Text>
            </BlockStack>

            <Text variant="bodyMd" as="span">
              To: {toLocationQuery.data?.name}
            </Text>

            <TextField
              label="Quantity"
              type="number"
              autoComplete="off"
              value={updatedLineItem.quantity.toString()}
              onChange={value => {
                const quantity = parseInt(value, 10);
                if (!isNaN(quantity) && quantity > 0) {
                  setUpdatedLineItem(prev => (prev ? { ...prev, quantity } : null));
                }
              }}
              min={1}
            />

            <Select
              label="Status"
              options={[
                { label: 'Pending', value: 'PENDING' },
                { label: 'Ready', value: 'READY' },
                { label: 'In Transit', value: 'IN_TRANSIT' },
                { label: 'Completed', value: 'COMPLETED' },
                { label: 'Cancelled', value: 'CANCELLED' },
              ]}
              value={updatedLineItem.status}
              onChange={value => {
                setUpdatedLineItem(prev =>
                  prev ? { ...prev, status: value as StockTransferLineItem['status'] } : null,
                );
              }}
            />

            <BlockStack gap="400">
              <Button tone="critical" onClick={handleRemove}>
                Remove
              </Button>
              <Button variant="primary" onClick={handleSave}>
                Save
              </Button>
            </BlockStack>
          </BlockStack>
        </Modal.Section>
      </Modal>

      {toast}
    </>
  );
}
