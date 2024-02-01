import { getProductVariantDefaultChargesMetafield } from './product-variant-default-charges.js';
import { InstallableMetafieldService } from './installable-metafield-service.js';
import { MetafieldDefinitionInput } from '../gql/queries/generated/schema.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';

export type MetafieldDefinition = MetafieldDefinitionInput | ((graphql: Graphql) => Promise<MetafieldDefinitionInput>);

const metafieldDefinitions: MetafieldDefinition[] = [getProductVariantDefaultChargesMetafield];

export const installableMetafieldService = new InstallableMetafieldService(metafieldDefinitions);
