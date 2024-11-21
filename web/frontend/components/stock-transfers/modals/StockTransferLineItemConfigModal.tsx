import { Modal, BlockStack, Select, TextField, Text, InlineStack, DataTable } from '@shopify/polaris';
import { CreateStockTransferDispatchProxy } from '@work-orders/common/create-stock-transfer/reducer.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useInventoryItemQuery } from '@work-orders/common/queries/use-inventory-item-query.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useEffect, useState } from 'react';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { StockTransferLineItem } from '@web/schemas/generated/create-stock-transfer.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { sentenceCase } from '@teifi-digital/shopify-app-toolbox/string';

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

  useEffect(() => {
    setUpdatedLineItem(lineItem);
  }, [lineItem]);

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
        primaryAction={{
          content: 'Save',
          onAction: handleSave,
        }}
        secondaryActions={[
          { content: 'Cancel', onAction: onClose },
          { content: 'Remove', onAction: handleRemove, destructive: true },
        ]}
      >
        {fromLocationQuery.data && toLocationQuery.data && (
          <Modal.Section>
            <Text as="h3" fontWeight="semibold">
              {`From ${fromLocationQuery.data.name} to ${toLocationQuery.data.name}`}
            </Text>
          </Modal.Section>
        )}
        {fromLocationQuery.data && fromInventoryItemQuery.data?.inventoryLevel && (
          <Modal.Section>
            <InlineStack align="center">
              <Text as="h3" fontWeight="semibold">
                Current stock at {fromLocationQuery.data?.name}
              </Text>
            </InlineStack>
            <DataTable
              columnContentTypes={['text', 'numeric']}
              headings={['Status', 'Quantity']}
              rows={fromInventoryItemQuery.data?.inventoryLevel?.quantities.map(({ name, quantity }) => [
                sentenceCase(name),
                quantity,
              ])}
            />
          </Modal.Section>
        )}

        <Modal.Section>
          <BlockStack gap="400">
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
                { label: 'In Transit', value: 'IN_TRANSIT' },
                { label: 'Received', value: 'RECEIVED' },
                { label: 'Rejected', value: 'REJECTED' },
              ]}
              value={updatedLineItem.status}
              onChange={value => {
                setUpdatedLineItem(prev =>
                  prev ? { ...prev, status: value as StockTransferLineItem['status'] } : null,
                );
              }}
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

      {toast}
    </>
  );
}
