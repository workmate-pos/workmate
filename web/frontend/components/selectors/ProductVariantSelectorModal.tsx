import { Modal } from '@shopify/polaris';
import { ProductVariantSelector, ProductVariantSelectorProps } from './ProductVariantSelector.js';

export type ProductVariantSelectorModalProps = ProductVariantSelectorProps & {
  open: boolean;
  onClose: () => void;
  title?: string;
};

export function ProductVariantSelectorModal({
  open,
  onClose,
  title = 'Product variants',
  ...rest
}: ProductVariantSelectorModalProps) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <ProductVariantSelector {...rest} />
    </Modal>
  );
}
