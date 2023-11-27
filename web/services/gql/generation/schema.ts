import {
  GraphQLNamedType,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  isScalarType,
  isUnionType,
} from 'graphql';
import { GraphQLSchema } from 'graphql/index.js';
import { getDocComment, titleCase, unpackNamedType } from './util.js';
import { never } from '../../../util/never.js';

import { GenQLOptions } from './config.js';

type TypeDefinition = {
  tsName: string;
  definition: string;
};

export function getSchemaDefinitions(schema: GraphQLSchema, requiredTypeNames: Set<string>, options: GenQLOptions) {
  const typeDefinitions: Record<string, string> = {};

  for (const typeName of requiredTypeNames) {
    const isTopLevelType = !typeName.includes('.');

    if (!isTopLevelType) {
      continue;
    }

    const namedType =
      schema.getType(typeName) ??
      never(`Invalid type name '${typeName}' in requiredTypeDefinitions. Potential issue in document processing.`);

    const typeDefinition = getTypeDefinitionForNamedType(namedType, requiredTypeNames, options);

    if (typeDefinition.tsName in typeDefinitions) {
      throw new Error(`Duplicate type name: ${typeDefinition.tsName}. Change your naming strategy to prevent this.`);
    }

    typeDefinitions[typeDefinition.tsName] = typeDefinition.definition;
  }

  return typeDefinitions;
}

function getTypeDefinitionForNamedType(
  namedType: GraphQLNamedType,
  requiredTypeDefinitions: Set<string>,
  options: GenQLOptions,
): TypeDefinition {
  const tsName = getTsNameForNamedType(namedType.name);

  let definition = '';

  if (options.emitComments) {
    definition += getDocComment({ description: namedType.description });
  }

  if (isScalarType(namedType)) {
    definition += `export type ${tsName} = `;
    definition +=
      {
        String: 'string',
        Int: 'number',
        Float: 'number',
        Boolean: 'boolean',
        ID: 'string',
        ...options.scalarTypes,
      }[namedType.name] ?? options.defaultScalarType;
  } else if (isObjectType(namedType) || isInterfaceType(namedType) || isInputObjectType(namedType)) {
    definition += `export type ${tsName} = {\n`;

    const fields = Object.values(namedType.getFields());

    for (const { name: fieldName, type: fieldType, description, deprecationReason } of fields) {
      if (options.pruneUnusedTypes && !requiredTypeDefinitions.has(`${namedType.name}.${fieldName}`)) {
        continue;
      }

      if (options.emitComments) {
        definition += getDocComment({ description, deprecationReason });
      }

      const { type, prefix, suffix } = unpackNamedType(fieldType);

      definition += `${fieldName}: `;
      definition += `${prefix}${getTsNameForNamedType(type.name)}${suffix}`;
      definition += ';\n';
    }

    definition += '};';
  } else if (isEnumType(namedType)) {
    definition += `export enum ${tsName} {\n`;

    for (const { name, value, description, deprecationReason } of namedType.getValues()) {
      if (options.emitComments) {
        definition += getDocComment({ description, deprecationReason });
      }

      definition += `${name} = ${JSON.stringify(value)},\n`;
    }

    definition += '};';
  } else if (isUnionType(namedType)) {
    definition += `export type ${tsName} = `;

    const parts: string[] = [];

    for (const unionType of namedType.getTypes()) {
      const { type, prefix, suffix } = unpackNamedType(unionType);

      parts.push(`${prefix}${getTsNameForNamedType(type.name)}${suffix}`);
    }

    definition += parts.join(' | ');
  } else {
    return namedType satisfies never;
  }

  return {
    tsName,
    definition,
  };
}

export function getTsNameForNamedType(name: string): string {
  return titleCase(name);
}
