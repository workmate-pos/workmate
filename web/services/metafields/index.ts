import { getProductVariantDefaultChargesMetafield } from './product-variant-default-charges.js';
import { InstallableMetafieldService } from './installable-metafield-service.js';
import { MetafieldDefinitionInput } from '../gql/queries/generated/schema.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { customerIsVendorMetafield } from './customer-is-vendor-metafield.js';
import { WithRequired } from '../../util/types.js';

export type MetafieldDefinitionInputWithNamespace = WithRequired<MetafieldDefinitionInput, 'namespace'>;

export type MetafieldDefinition =
  | MetafieldDefinitionInputWithNamespace
  | ((graphql: Graphql) => Promise<MetafieldDefinitionInputWithNamespace>);

const metafieldDefinitions: MetafieldDefinition[] = [
  getProductVariantDefaultChargesMetafield,
  customerIsVendorMetafield,
];

export const installableMetafieldService = new InstallableMetafieldService(metafieldDefinitions);
