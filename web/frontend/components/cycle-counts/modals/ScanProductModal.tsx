import { Modal, BlockStack } from '@shopify/polaris';
import { ProductVariant } from '@work-orders/common/queries/use-product-variants-query.js';
import { uuid } from '@work-orders/common/util/uuid.js';
import { CreateCycleCountItem } from '@web/schemas/generated/create-cycle-count.js';
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
          <BarcodeTextField disabled={disabled} onProductScanned={handleProductScanned} />
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
