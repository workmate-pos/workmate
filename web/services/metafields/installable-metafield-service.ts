import type { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { gql } from '../gql/gql.js';
import type { MetafieldDefinitionInput } from '../gql/queries/generated/schema.js';
import { sentryErr } from '@teifi-digital/shopify-app-express/services/sentry.js';
import { InstallableService } from '@teifi-digital/shopify-app-express/services/installable-service.js';

// TODO: Include in shopify-app-express (first move it to genql)

export type MetafieldDefinitions = (
  | MetafieldDefinitionInput
  | ((graphql: Graphql) => Promise<MetafieldDefinitionInput>)
)[];

export class InstallableMetafieldService extends InstallableService {
  constructor(public readonly metafieldDefinitions: MetafieldDefinitions) {
    super();
  }

  override async initStore(graphql: Graphql): Promise<void> {
    for (const definitionOrFn of this.metafieldDefinitions) {
      const definition = typeof definitionOrFn === 'function' ? await definitionOrFn(graphql) : definitionOrFn;

      const {
        metafieldDefinitions: { nodes: [existingMetafieldDefinition = undefined] = [] },
      } = await gql.metafields.getDefinition.run(graphql, {
        key: definition.key,
        namespace: definition.namespace,
        ownerType: definition.ownerType,
      });

      if (existingMetafieldDefinition) {
        continue;
      }

      const result = await gql.metafields.createDefinition.run(graphql, { definition });
      if (result?.metafieldDefinitionCreate?.userErrors) {
        sentryErr(
          `Failed to create metafield definition '${definition.key}' on ${definition.ownerType}`,
          result.metafieldDefinitionCreate.userErrors,
        );
      }
    }
  }
}