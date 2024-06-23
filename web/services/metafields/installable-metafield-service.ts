import type { Graphql } from '@teifi-digital/shopify-app-express/services';
import { gql } from '../gql/gql.js';
import type { MetafieldDefinitionInput } from '../gql/queries/generated/schema.js';
import { sentryErr, InstallableService } from '@teifi-digital/shopify-app-express/services';
import { WithRequired } from '../../util/types.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';

// TODO: Include in shopify-app-express (first move it to genql)

export type MetafieldDefinitions = (
  | WithRequired<MetafieldDefinitionInput, 'namespace'>
  | ((graphql: Graphql) => Promise<WithRequired<MetafieldDefinitionInput, 'namespace'>>)
)[];

export class InstallableMetafieldService extends InstallableService {
  constructor(public readonly metafieldDefinitions: MetafieldDefinitions) {
    super();
  }

  override async initStore(graphql: Graphql): Promise<void> {
    await Promise.all(
      this.metafieldDefinitions
        .map(async definitionOrFn => {
          const definition = typeof definitionOrFn === 'function' ? await definitionOrFn(graphql) : definitionOrFn;

          await ensureMetafieldDefinitionExists(graphql, definition);

          console.log(`Created metafield definition '${definition.key}' on ${definition.ownerType}`);
        })
        .map(promise => promise.catch(error => sentryErr(error))),
    );
  }
}

export async function ensureMetafieldDefinitionExists(
  graphql: Graphql,
  definition: WithRequired<MetafieldDefinitionInput, 'namespace'>,
): Promise<ID> {
  const {
    metafieldDefinitions: { nodes: [existingMetafieldDefinition = undefined] = [] },
  } = await gql.metafields.getDefinition.run(graphql, {
    key: definition.key,
    namespace: definition.namespace,
    ownerType: definition.ownerType,
  });

  if (existingMetafieldDefinition) {
    return existingMetafieldDefinition.id;
  }

  const result = await gql.metafields.createDefinition.run(graphql, {
    definition: {
      ...definition,
      // Pinning fails if there are already many pinned, so create first, pin after
      pin: false,
    },
  });

  if (!result.metafieldDefinitionCreate?.createdDefinition) {
    throw new HttpError('Failed to create service metafield definition', 500);
  }

  if (definition.pin) {
    await gql.metafields.pin
      .run(graphql, {
        id: result.metafieldDefinitionCreate.createdDefinition.id,
      })
      .catch(error => sentryErr(error));
  }

  return result.metafieldDefinitionCreate.createdDefinition.id;
}
