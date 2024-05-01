import { getProductVariantDefaultChargesMetafield } from './product-variant-default-charges.js';
import { InstallableMetafieldService } from './installable-metafield-service.js';
import { MetafieldDefinitionInput } from '../gql/queries/generated/schema.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { customerIsVendorMetafield } from './customer-is-vendor-metafield.js';
import { WithRequired } from '../../util/types.js';
import { productServiceTypeMetafield } from './product-service-type-metafield.js';

export type MetafieldDefinitionInputWithNamespace = WithRequired<MetafieldDefinitionInput, 'namespace'>;

export type MetafieldDefinition =
  | MetafieldDefinitionInputWithNamespace
  | ((graphql: Graphql) => Promise<MetafieldDefinitionInputWithNamespace>);

const metafieldDefinitions: MetafieldDefinition[] = [
  getProductVariantDefaultChargesMetafield,
  customerIsVendorMetafield,
  productServiceTypeMetafield,
];

export const installableMetafieldService = new InstallableMetafieldService(metafieldDefinitions);
