import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { parseMetaobject } from './metaobjects/index.js';
import { fetchAllPages, gql } from './gql/gql.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services';

export function parseProductVariantMetafields<const T extends gql.products.ProductVariantFragment.Result>(
  productVariant: T,
) {
  return {
    ...productVariant,
    defaultCharges:
      productVariant.defaultCharges?.references?.nodes
        .filter(isNonNullable)
        .filter(hasPropertyValue('__typename', 'Metaobject'))
        .map(node => parseMetaobject(node))
        .filter(isNonNullable) ?? [],
  };
}

export async function addProductVariantComponents<const T extends gql.products.ProductVariantFragment.Result>(
  graphql: Graphql,
  productVariant: T,
) {
  if (!productVariant.requiresComponents) {
    return { ...productVariant, productVariantComponents: [] };
  }

  const productVariantComponents = await fetchAllPages(
    graphql,
    (graphql, variables) =>
      gql.products.getProductVariantComponents.run(graphql, {
        ...variables,
        id: productVariant.id,
      }),
    result =>
      result.productVariant?.productVariantComponents ?? {
        nodes: [] as const,
        pageInfo: { hasNextPage: false, endCursor: null },
      },
  );

  return { ...productVariant, productVariantComponents };
}

export type ProductVariantFragmentWithMetafields = ReturnType<typeof parseProductVariantMetafields>;
export type ProductVariantFragmentWithComponents = Awaited<ReturnType<typeof addProductVariantComponents>>;
