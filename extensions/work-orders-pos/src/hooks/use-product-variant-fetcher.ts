import { useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { ProductVariant } from '@shopify/retail-ui-extensions';

export const useProductVariantFetcher = () => {
  const api = useExtensionApi<'pos.home.modal.render'>();

  return async (productVariantIds: number[]) => {
    const productVariantBatchSize = 25;
    const productVariants = await Promise.all(
      Array.from({ length: Math.ceil(productVariantIds.length / productVariantBatchSize) }, (_, i) => {
        const batch = productVariantIds.slice(productVariantBatchSize * i, productVariantBatchSize * (i + 1));
        return api.productSearch.fetchProductVariantsWithIds(batch).then(result => result.fetchedResources);
      }),
    ).then(array => array.flat());

    const productVariantRecord = Object.fromEntries(productVariants.map(p => [p.id, p]));

    return productVariantRecord as Partial<Record<string, ProductVariant>>;
  };
};
