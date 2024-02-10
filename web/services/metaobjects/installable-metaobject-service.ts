import type { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { gql } from '../gql/gql.js';
import type { MetaobjectDefinitionCreateInput } from '../gql/queries/generated/schema.js';
import { sentryErr } from '@teifi-digital/shopify-app-express/services/sentry.js';
import { InstallableService } from '@teifi-digital/shopify-app-express/services/installable-service.js';

// TODO: Include in shopify-app-express (first move it to genql)

export type MetaobjectDefinitions = MetaobjectDefinitionCreateInput[];

export class InstallableMetaobjectService extends InstallableService {
  constructor(public readonly metaobjectDefinitions: MetaobjectDefinitions) {
    super();
  }

  override async initStore(graphql: Graphql): Promise<void> {
    for (const definition of this.metaobjectDefinitions) {
      const { metaobjectDefinitionByType: existingMetaobjectDefinition } =
        await gql.metaobjects.getDefinitionByType.run(graphql, { type: definition.type });

      if (existingMetaobjectDefinition) {
        continue;
      }

      const result = await gql.metaobjects.createDefinition.run(graphql, { definition });
      if (result?.metaobjectDefinitionCreate?.userErrors) {
        sentryErr(
          `Failed to create metaobject definition '${definition.type}'`,
          result.metaobjectDefinitionCreate.userErrors,
        );
      } else {
        console.log(`Created metaobject definition '${definition.type}'`);
      }
    }
  }
}
