import type { Graphql } from '@teifi-digital/shopify-app-express/services';
import { gql } from '../gql/gql.js';
import type {
  MetaobjectDefinitionCreateInput,
  MetaobjectFieldDefinitionOperationInput,
} from '../gql/queries/generated/schema.js';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { InstallableService } from '@teifi-digital/shopify-app-express/services';
import { never } from '@teifi-digital/shopify-app-toolbox/util';

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

      let result;

      if (existingMetaobjectDefinition) {
        const oldKeys = existingMetaobjectDefinition.fieldDefinitions.map(fd => fd.key);
        const newKeys = definition.fieldDefinitions.map(fd => fd.key);

        const deletedKeys = oldKeys.filter(key => !newKeys.includes(key));
        const createdKeys = newKeys.filter(key => !oldKeys.includes(key));
        const updatedKeys = newKeys.filter(key => oldKeys.includes(key));

        const deleteFieldDefinitions: MetaobjectFieldDefinitionOperationInput[] = deletedKeys.map(key => ({
          delete: {
            key,
          },
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

        const updateResult = await gql.metaobjects.updateDefinition.run(graphql, {
          id: existingMetaobjectDefinition.id,
          definition: {
            description: definition.description,
            fieldDefinitions: [...deleteFieldDefinitions, ...updateFieldDefinitions, ...createFieldDefinitions],
            access: definition.access,
            capabilities: definition.capabilities,
            name: definition.name,
            displayNameKey: definition.displayNameKey,
            resetFieldOrder: true,
          },
        });

        result = updateResult.metaobjectDefinitionUpdate;
      } else {
        const createResult = await gql.metaobjects.createDefinition.run(graphql, { definition });
        result = createResult.metaobjectDefinitionCreate;
      }

      if (result?.userErrors?.length) {
        sentryErr(`Failed to create metaobject definition '${definition.type}'`, result.userErrors);
      } else {
        console.log(`Created metaobject definition '${definition.type}'`);
      }
    }
  }
}
