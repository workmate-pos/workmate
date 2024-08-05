import type { Graphql } from '@teifi-digital/shopify-app-express/services';
import { gql } from '../gql/gql.js';
import type {
  MetaobjectDefinitionCreateInput,
  MetaobjectFieldDefinitionOperationInput,
} from '../gql/queries/generated/schema.js';
import { sentryErr, InstallableService } from '@teifi-digital/shopify-app-express/services';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

// TODO: Include in shopify-app-express (first move it to genql)

export type MetaobjectDefinitions = MetaobjectDefinitionCreateInput[];

export class InstallableMetaobjectService extends InstallableService {
  constructor(public readonly metaobjectDefinitions: MetaobjectDefinitions) {
    super();
  }

  override async initStore(graphql: Graphql): Promise<void> {
    await Promise.all(
      this.metaobjectDefinitions
        .map(async definition => {
          await ensureMetaobjectDefinitionExists(graphql, definition);

          console.log(`Created metaobject definition '${definition.type}'`);
        })
        .map(promise => promise.catch(error => sentryErr(error))),
    );
  }
}

export async function ensureMetaobjectDefinitionExists(
  graphql: Graphql,
  definition: MetaobjectDefinitionCreateInput,
): Promise<ID> {
  const { metaobjectDefinitionByType: existingMetaobjectDefinition } = await gql.metaobjects.getDefinitionByType.run(
    graphql,
    { type: definition.type },
  );

  if (existingMetaobjectDefinition) {
    const oldKeys = existingMetaobjectDefinition.fieldDefinitions.map(fd => fd.key);
    const newKeys = definition.fieldDefinitions.map(fd => fd.key);

    const deletedKeys = oldKeys.filter(key => !newKeys.includes(key));
    const createdKeys = newKeys.filter(key => !oldKeys.includes(key));
    const updatedKeys = newKeys.filter(key => oldKeys.includes(key));

    const deleteFieldDefinitions: MetaobjectFieldDefinitionOperationInput[] = deletedKeys.map(key => ({
      delete: { key },
    }));

    const updateFieldDefinitions: MetaobjectFieldDefinitionOperationInput[] = updatedKeys.map(key => {
      const fieldDefinition = definition.fieldDefinitions.find(fd => fd.key === key) ?? never();

      return {
        update: {
          key,
          name: fieldDefinition.name,
          description: fieldDefinition.description,
          required: fieldDefinition.required,
          validations: fieldDefinition.validations,
        },
      };
    });

    const createFieldDefinitions: MetaobjectFieldDefinitionOperationInput[] = createdKeys.map(key => {
      const fieldDefinition = definition.fieldDefinitions.find(fd => fd.key === key) ?? never();

      return {
        create: {
          key,
          type: fieldDefinition.type,
          name: fieldDefinition.name,
          description: fieldDefinition.description,
          required: fieldDefinition.required,
          validations: fieldDefinition.validations,
        },
      };
    });

    const fieldDefinitions = [...deleteFieldDefinitions, ...updateFieldDefinitions, ...createFieldDefinitions];

    if (fieldDefinitions.length === 0) {
      return existingMetaobjectDefinition.id;
    }

    const { metaobjectDefinitionUpdate } = await gql.metaobjects.updateDefinition.run(graphql, {
      id: existingMetaobjectDefinition.id,
      definition: {
        description: definition.description,
        fieldDefinitions,
        access: definition.access,
        capabilities: definition.capabilities,
        name: definition.name,
        displayNameKey: definition.displayNameKey,
        resetFieldOrder: true,
      },
    });

    if (!metaobjectDefinitionUpdate?.metaobjectDefinition) {
      throw new HttpError('Failed to update service metaobject definition', 500);
    }

    return metaobjectDefinitionUpdate?.metaobjectDefinition.id;
  }

  const { metaobjectDefinitionCreate } = await gql.metaobjects.createDefinition.run(graphql, { definition });

  if (!metaobjectDefinitionCreate?.metaobjectDefinition) {
    throw new HttpError('Failed to create service metaobject definition', 500);
  }

  return metaobjectDefinitionCreate.metaobjectDefinition.id;
}
