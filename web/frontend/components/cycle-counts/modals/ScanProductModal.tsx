import { Modal, BlockStack, EmptyState, Text } from '@shopify/polaris';
import { ProductVariant } from '@work-orders/common/queries/use-product-variants-query.js';
import { uuid } from '@work-orders/common/util/uuid.js';
import { CreateCycleCountItem } from '@web/schemas/generated/create-cycle-count.js';
import { emptyState } from '@web/frontend/assets/index.js';
import { BarcodeTextField } from '../../BarcodeTextField.js';

type Props = {
  open: boolean;
  onClose: () => void;
  onProductScanned: (item: CreateCycleCountItem) => void;
  disabled?: boolean;
};

export function ScanProductModal({ open, onClose, onProductScanned, disabled }: Props) {
  const handleProductScanned = (product: ProductVariant) => {
    onProductScanned({
      uuid: uuid(),
      productVariantId: product.id,
      productVariantTitle: product.title,
      productTitle: product.product.title,
      countQuantity: 1,
      inventoryItemId: product.inventoryItem.id,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Scan Products"
      secondaryActions={[
        {
          content: 'Close',
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <BarcodeTextField
            disabled={disabled}
            onProductScanned={handleProductScanned}
            emptyState={
              <EmptyState heading="Scan a barcode" image={emptyState}>
                <Text variant="bodyMd" tone="subdued" as="p" alignment="center">
                  Use a barcode scanner or enter a barcode manually
                </Text>
              </EmptyState>
            }
          />
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
