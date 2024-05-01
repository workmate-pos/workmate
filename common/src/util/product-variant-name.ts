export function getProductVariantName(
  productVariant?: {
    product?: { hasOnlyDefaultVariant: boolean; title: string };
    title: string;
  } | null,
) {
  if (!productVariant) {
    return null;
  }

  if (productVariant.product?.hasOnlyDefaultVariant) {
    return productVariant.product.title;
  }

  return `${productVariant?.product?.title} - ${productVariant?.title}`;
}
