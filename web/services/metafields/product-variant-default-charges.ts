import { fixedPriceLabourChargeMetaobject } from '../metaobjects/fixed-price-labour-charge.js';
import { hourlyLabourChargeMetaobject } from '../metaobjects/hourly-labour-charge.js';
import { gql } from '../gql/gql.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import type { MetafieldDefinitionInputWithNamespace } from './index.js';
import { ensureMetaobjectDefinitionExists } from '../metaobjects/installable-metaobject-service.js';

export const baseProductVariantDefaultChargesMetafield = {
  name: 'Default Charges',
  key: 'default-charges',
  type: 'list.mixed_reference',
  ownerType: 'PRODUCTVARIANT',
  namespace: '$app',
  description: 'Additional charges that are applied by default within WorkMate POS',
  access: {
    admin: 'MERCHANT_READ_WRITE',
  },
  pin: true,
} as const;

export async function getProductVariantDefaultChargesMetafield(
  graphql: Graphql,
): Promise<MetafieldDefinitionInputWithNamespace> {
  const referenceIds = await Promise.all([
    ensureMetaobjectDefinitionExists(graphql, fixedPriceLabourChargeMetaobject.definition),
    ensureMetaobjectDefinitionExists(graphql, hourlyLabourChargeMetaobject.definition),
  ]);

  return {
    ...baseProductVariantDefaultChargesMetafield,
    validations: [
      // this validation is mandatory
      {
        name: 'metaobject_definition_ids',
        value: JSON.stringify(referenceIds),
      },
    ],
  };
}
