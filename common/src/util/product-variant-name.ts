export function getProductVariantName(
  productVariant?: {
    product?: { hasOnlyDefaultVariant: boolean; title: string };
    title: string;
  } | null,
) {
  return productVariant
    ? productVariant?.product?.hasOnlyDefaultVariant
      ? productVariant?.product?.title
      : `${productVariant?.product?.title} - ${productVariant?.title}`
    : null;
}
