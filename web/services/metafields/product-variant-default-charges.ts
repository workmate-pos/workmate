import { fixedPriceLabourChargeMetaobject } from '../metaobjects/fixed-price-labour-charge.js';
import { hourlyLabourChargeMetaobject } from '../metaobjects/hourly-labour-charge.js';
import { gql } from '../gql/gql.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import type { MetafieldDefinitionInputWithNamespace } from './index.js';

export async function getProductVariantDefaultChargesMetafield(
  graphql: Graphql,
): Promise<MetafieldDefinitionInputWithNamespace> {
  const validMetaobjectReferences = [fixedPriceLabourChargeMetaobject, hourlyLabourChargeMetaobject];

  const validMetaobjectReferenceDefinitions = await Promise.all(
    validMetaobjectReferences.map(metaobject =>
      gql.metaobjects.getDefinitionByType.run(graphql, { type: metaobject.definition.type }),
    ),
  );

  const validMetaobjectReferenceIds = validMetaobjectReferenceDefinitions.map(
    result => result.metaobjectDefinitionByType?.id ?? never(),
  );

  return {
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
    validations: [
      // this validation is mandatory
      {
        name: 'metaobject_definition_ids',
        value: JSON.stringify(validMetaobjectReferenceIds),
      },
    ],
  };
}
