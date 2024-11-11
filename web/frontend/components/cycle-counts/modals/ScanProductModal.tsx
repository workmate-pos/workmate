import { Modal, BlockStack, Text, List } from '@shopify/polaris';
import { useState } from 'react';
import { ToastActionCallable } from '@teifi-digital/shopify-app-react';
import { ProductVariant } from '@work-orders/common/queries/use-product-variants-query.js';
import { uuid } from '@work-orders/common/util/uuid.js';
import { CreateCycleCountItem } from '@web/schemas/generated/create-cycle-count.js';
import { BarcodeTextField } from '../../BarcodeTextField.js';

interface Props {
  open: boolean;
  onClose: () => void;
  onProductScanned: (item: CreateCycleCountItem) => void;
  disabled?: boolean;
  setToastAction: ToastActionCallable;
}

export function ScanProductModal({ open, onClose, onProductScanned, disabled, setToastAction }: Props) {
  const [scannedProduct, setScannedProduct] = useState<ProductVariant | null>(null);

  const handleProductScanned = (product: ProductVariant) => {
    setScannedProduct(product);
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
            setToastAction={setToastAction}
          />
          {scannedProduct && (
            <div>
              <Text variant="bodyMd" as="p">
                Last Scanned Product:
              </Text>
              <List type="bullet">
                <List.Item>Title: {scannedProduct.product.title}</List.Item>
                <List.Item>Variant: {scannedProduct.title}</List.Item>
                <List.Item>ID: {scannedProduct.id}</List.Item>
              </List>
            </div>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
