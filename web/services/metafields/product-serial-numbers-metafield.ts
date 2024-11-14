import { WithRequired } from '../../util/types.js';
import { MetafieldDefinitionInput } from '../gql/queries/generated/schema.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql';
import { gql } from '../gql/gql.js';
import { USES_SERIAL_NUMBERS_TAG } from '@work-orders/common/metafields/uses-serial-numbers.js';

export const productSerialNumbersMetafield: WithRequired<MetafieldDefinitionInput, 'namespace'> = {
  name: 'Uses Serial Numbers',
  key: 'serial-numbers',
  type: 'boolean',
  ownerType: 'PRODUCT',
  namespace: '$app',
  description: 'Whether this product uses serial numbers',
  access: {
    admin: 'MERCHANT_READ_WRITE',
  },
  pin: true,
};

/**
 * Syncs the Uses Serial Numbers metafield with the product tags to make it searchable.
 * Returns whether the sync resulted in a change.
 */
export async function syncProductUsesSerialNumbersTag(session: Session, productId: ID): Promise<boolean> {
  const graphql = new Graphql(session);

  const { product } = await gql.products.getProduct.run(graphql, { id: productId });

  if (!product) {
    throw new Error(`Product with id ${productId} not found`);
  }

  const hasSerialNumbers = product.hasSerialNumbers?.jsonValue === true;
  const hasSerialNumbersTag = product.tags.some(tag => tag === USES_SERIAL_NUMBERS_TAG);

  const removeTags = !hasSerialNumbers && hasSerialNumbersTag ? [USES_SERIAL_NUMBERS_TAG] : [];
  const addTags = hasSerialNumbers && !hasSerialNumbersTag ? [USES_SERIAL_NUMBERS_TAG] : [];

  if (removeTags.length > 0 || addTags.length > 0) {
    await gql.tags.removeAndAddTags.run(graphql, {
      id: productId,
      removeTags,
      addTags,
    });
    return true;
  }

  return false;
}
