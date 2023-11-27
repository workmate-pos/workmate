import { Source } from 'graphql-config';
import { getTsNameForNamedType } from './schema.js';
import {
  GraphQLNamedType,
  isInterfaceType,
  isNonNullType,
  isObjectType,
  Kind,
  SelectionNode,
  TypeNode,
  VariableDefinitionNode,
} from 'graphql';
import { titleCase, unpackNamedType } from './util.js';
import { never } from '../../../util/never.js';
import { GraphQLSchema } from 'graphql/index.js';

export function getDocumentDefinitions(source: Source, schema: GraphQLSchema) {
  const { document = never(), location = never() } = source;

  const fragmentDefinitions: Record<string, string> = {};
  const operationDefinitions: Record<string, string> = {};

  // types that are required in the schema output
  const requiredTypeNames = new Set<string>();

  // types that are used in the document output (i.e. should be imported)
  const usedTypeNames = new Set<string>();

  for (const definitionNode of document.definitions) {
    switch (definitionNode.kind) {
      case Kind.FRAGMENT_DEFINITION: {
        const fragmentName = definitionNode.name.value;

        if (fragmentName in fragmentDefinitions) {
          throw new Error(`Duplicate fragment '${fragmentName}' in document '${location}'`);
        }

        const tsName = getTsNameForFragment(fragmentName);

        const baseType = schema.getType(definitionNode.typeCondition.name.value) ?? never();
        const tsType = getInlineSelectionSetDefinition(definitionNode.selectionSet.selections, baseType);
        const definition = `export type ${tsName} = ${tsType.definition};\n`;

        fragmentDefinitions[fragmentName] = definition;

        requiredTypeNames.add(baseType.name);

        for (const referencedTypeName of tsType.requiredTypeNames) {
          requiredTypeNames.add(referencedTypeName);
        }

        for (const usedTypeName of tsType.usedTypeNames) {
          usedTypeNames.add(usedTypeName);
        }

        break;
      }

      case Kind.OPERATION_DEFINITION: {
        const operationName = definitionNode.name?.value ?? never();

        if (operationName in operationDefinitions) {
          throw new Error(`Duplicate operation name '${operationName}' in document '${location}'`);
        }

        let definition = '';

        // query string
        {
          const queryDefinitionTsName = getTsNameForOperationDefinition(operationName);
          const queryLoc = definitionNode.loc ?? never();
          const queryBody = queryLoc.source.body.slice(queryLoc.start, queryLoc.end);

          definition += `export const ${queryDefinitionTsName} = ${JSON.stringify(queryBody)};\n`;
        }

        // variables type
        {
          const tsType = getInlineVariablesDefinition(definitionNode.variableDefinitions ?? []);

          const variablesTsName = getTsNameForOperationVariables(operationName);
          definition += `export type ${variablesTsName} = ${tsType.definition};\n`;

          for (const referencedTypeName of tsType.requiredTypeNames) {
            requiredTypeNames.add(referencedTypeName);
          }

          for (const usedTypeName of tsType.usedTypeNames) {
            usedTypeNames.add(usedTypeName);
          }
        }

        // result type
        {
          const baseType = schema.getRootType(definitionNode.operation) ?? never();
          const tsType = getInlineSelectionSetDefinition(definitionNode.selectionSet.selections, baseType);

          const resultTsName = getTsNameForOperationResult(operationName);
          definition += `export type ${resultTsName} = ${tsType.definition};\n`;

          requiredTypeNames.add(baseType.name);

          for (const referencedTypeName of tsType.requiredTypeNames) {
            requiredTypeNames.add(referencedTypeName);
          }

          for (const usedTypeName of tsType.usedTypeNames) {
            usedTypeNames.add(usedTypeName);
          }
        }

        operationDefinitions[operationName] = definition;

        break;
      }

      default:
        console.warn(`Encountered an unknown definition kind '${definitionNode.kind}' in document '${location}`);
    }
  }

  return {
    fragmentDefinitions,
    operationDefinitions,
    requiredTypeNames,
    usedTypeNames,
  };
}

type TsInlineObjectDefinition = {
  definition: string;
  requiredTypeNames: Set<string>;
  usedTypeNames: Set<string>;
};

function getInlineSelectionSetDefinition(
  selections: readonly SelectionNode[],
  type: GraphQLNamedType,
): TsInlineObjectDefinition {
  let definition = '{\n';
  const requiredTypeNames = new Set<string>();
  const usedTypeNames = new Set<string>();

  for (const selection of selections) {
    switch (selection.kind) {
      case Kind.FRAGMENT_SPREAD:
        const fragmentTsName = getTsNameForFragment(selection.name.value);

        definition = `${fragmentTsName} & ${definition}`;

        break;

      case Kind.FIELD:
        if (!isObjectType(type) && !isInterfaceType(type)) {
          throw new Error(`Unexpected type named '${type.name}' with field - expected object or interface`);
        }

        const fieldName = selection.name.value;

        requiredTypeNames.add(`${type.name}.${fieldName}`);

        definition += `${fieldName}: `;

        const field = type.getFields()[fieldName] ?? never();
        const { type: innerFieldType, prefix, suffix } = unpackNamedType(field.type);

        requiredTypeNames.add(innerFieldType.name);

        if (selection.selectionSet) {
          const selectionSetDefinition = getInlineSelectionSetDefinition(
            selection.selectionSet.selections,
            innerFieldType,
          );

          definition += `${prefix}${selectionSetDefinition.definition}${suffix}`;

          for (const referencedTypeName of selectionSetDefinition.requiredTypeNames) {
            requiredTypeNames.add(referencedTypeName);
          }

          for (const usedTypeName of selectionSetDefinition.usedTypeNames) {
            usedTypeNames.add(usedTypeName);
          }
        } else {
          definition += `${getTsNameForNamedType(type.name)}[${JSON.stringify(fieldName)}]`;
          usedTypeNames.add(type.name);
        }

        definition += ';\n';

        break;

      case Kind.INLINE_FRAGMENT:
        throw new Error('Inline fragments are not supported yet');

      default:
        return selection satisfies never;
    }
  }

  definition += '}\n';

  return {
    definition,
    requiredTypeNames,
    usedTypeNames,
  };
}

function getInlineVariablesDefinition(
  variableDefinitions: readonly VariableDefinitionNode[],
): TsInlineObjectDefinition {
  let definition = `{\n`;
  const requiredTypeNames = new Set<string>();
  const usedTypeNames = new Set<string>();

  for (const { variable, type } of variableDefinitions) {
    const tsType = getInlineTypeNameDefinition(type);

    // if nullable, add undefined (to make object spread possible), and ?: (to make omitting possible)
    const nullable = !isNonNullType(type);

    definition += `${variable.name.value}${nullable ? '?' : ''}: `;
    definition += tsType.definition + (nullable ? ' | undefined' : '');
    definition += ';\n';

    requiredTypeNames.add(tsType.typeName);
    usedTypeNames.add(tsType.typeName);
  }
  definition += '};\n';

  return {
    definition,
    requiredTypeNames,
    usedTypeNames,
  };
}

type TsInlineTypeNameDefinition = {
  typeName: string;
  definition: string;
};

function getInlineTypeNameDefinition(typeNode: TypeNode): TsInlineTypeNameDefinition {
  if (typeNode.kind === Kind.NAMED_TYPE) {
    return {
      typeName: typeNode.name.value,
      definition: getTsNameForNamedType(typeNode.name.value) + ' | null',
    };
  }

  const [prefix, suffix] = {
    [Kind.LIST_TYPE]: ['Array<', '> | null'],
    [Kind.NON_NULL_TYPE]: ['NonNullable<', '>'],
  }[typeNode.kind];

  const { definition, typeName } = getInlineTypeNameDefinition(typeNode.type);

  return {
    typeName,
    definition: `${prefix}${definition}${suffix}`,
  };
}

/**
 * Get the name of the actual query, i.e. the GQL string/document node
 */
export function getTsNameForOperationDefinition(operationName: string) {
  return `${titleCase(operationName)}Operation`;
}

function getTsNameForFragment(fragmentName: string) {
  return `${titleCase(fragmentName)}Fragment`;
}

export function getTsNameForOperationVariables(operationName: string) {
  return `${getTsNameForOperationDefinition(operationName)}Variables`;
}

export function getTsNameForOperationResult(operationName: string) {
  return `${getTsNameForOperationDefinition(operationName)}Result`;
}
