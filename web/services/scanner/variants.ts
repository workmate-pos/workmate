import { findMetafields } from '../metafields/queries.js';
import { getShopSettings } from '../settings/settings.js';
import { getProductVariantsByProductIds } from '../product-variants/queries.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Session } from '@shopify/shopify-api';
import { ensureProductsExist } from '../products/sync.js';

export async function getProductVariantIdsByMetafieldValue(session: Session, value: string) {
  const { scanner } = await getShopSettings(session.shop);

  const variantIds = await Promise.all([
    getVariantIdsByMetafieldValues(
      session,
      scanner.variants.metafields.variant
        .map(metafield => metafield.split('.') as [string, string])
        .map(([namespace, key]) => ({ namespace, key })),
      value,
    ),

    getVariantIdsByProductMetafieldValues(
      session,
      scanner.variants.metafields.product
        .map(metafield => metafield.split('.') as [string, string])
        .map(([namespace, key]) => ({ namespace, key })),
      value,
    ),
  ]).then(result => result.flat(1));

  return unique(variantIds);
}

async function getVariantIdsByMetafieldValues(
  session: Session,
  metafields: { namespace: string; key: string }[],
  value: string,
) {
  const result = await findMetafields(
    session.shop,
    metafields.map(metafield => ({ namespace: metafield.namespace, key: metafield.key, value })),
    'gid://shopify/ProductVariant/%',
  );

  return unique(result.map(metafield => metafield.objectId as ID));
}

async function getVariantIdsByProductMetafieldValues(
  session: Session,
  metafields: { namespace: string; key: string }[],
  value: string,
) {
  const result = await findMetafields(
    session.shop,
    metafields.map(metafield => ({ namespace: metafield.namespace, key: metafield.key, value })),
    'gid://shopify/Product/%',
  );

  const productIds = unique(result.map(metafield => metafield.objectId as ID));
  const productVariants = await getProductVariantsByProductIds(productIds);

  return unique(productVariants.map(variant => variant.productVariantId));
}
