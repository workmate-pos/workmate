import { MetafieldDefinitionInput } from '../gql/queries/generated/schema.js';
import { WithRequired } from '../../util/types.js';
import { Session } from '@shopify/shopify-api';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { gql } from '../gql/gql.js';
import {
  AVAILABLE_PRODUCT_SERVICE_TYPES,
  parseProductServiceType,
  SERVICE_METAFIELD_VALUE_TAG_NAME,
} from '@work-orders/common/metafields/product-service-type.js';

export const productServiceTypeMetafield: WithRequired<MetafieldDefinitionInput, 'namespace'> = {
  name: 'Service Type',
  key: 'service-type',
  type: 'single_line_text_field',
  validations: [
    {
      name: 'choices',
      value: JSON.stringify(AVAILABLE_PRODUCT_SERVICE_TYPES),
    },
  ],
  ownerType: 'PRODUCT',
  namespace: '$app',
  description:
    'Quantity-Adjusting services should have unit price $1.00 as the quantity is used to set the final cost of the service.',
  access: {
    admin: 'MERCHANT_READ_WRITE',
  },
  pin: true,
};

/**
 * Syncs the Service Type metafield with the product tags.
 */
export async function syncProductServiceTypeTag(session: Session, productId: ID) {
  const graphql = new Graphql(session);

  const { product } = await gql.products.getProduct.run(graphql, { id: productId });

  if (!product) {
    throw new Error(`Product with id ${productId} not found`);
  }

  const serviceType = product.serviceType ? parseProductServiceType(product.serviceType.value) : null;

  await gql.tags.removeAndAddTags.run(graphql, {
    id: productId,
    removeTags: Object.values(SERVICE_METAFIELD_VALUE_TAG_NAME),
    addTags: serviceType ? [SERVICE_METAFIELD_VALUE_TAG_NAME[serviceType]] : [],
  });
}
