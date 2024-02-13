import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { parseMetaobject } from './metaobjects/index.js';
import { gql } from './gql/gql.js';

export function parseProductVariantMetafields(productVariant: gql.products.ProductVariantFragment.Result) {
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

export type ProductVariantFragmentWithMetafields = ReturnType<typeof parseProductVariantMetafields>;
