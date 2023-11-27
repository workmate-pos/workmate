import { GraphQLNamedType, GraphQLType, isListType, isNamedType, isNonNullType } from 'graphql/index.js';

export function titleCase(str: string) {
  return str.slice(0, 1).toUpperCase() + str.slice(1);
}

export function getDocComment({
  description,
  deprecationReason,
  defaultValue,
}: {
  description?: string | null;
  deprecationReason?: string | null;
  defaultValue?: unknown;
}) {
  const descriptionLines = description?.trim().split('\n') ?? [];
  const deprecationLines = deprecationReason ? [`@deprecated ${deprecationReason ?? ''}`] : [];
  const defaultValueLines = defaultValue ? [`@default ${JSON.stringify(defaultValue)}`] : [];

  if (descriptionLines.length === 0 && deprecationLines.length === 0 && defaultValueLines.length === 0) {
    return '';
  }

  return `/**\n${[...descriptionLines, ...deprecationLines, ...defaultValueLines]
    .map(line => ` * ${line}`)
    .join('\n')}\n */\n`;
}

/**
 * Gets the named type nested inside non-null and list types. Also emits the prefix and suffix required to wrap this type inside typescript Array<> and NonNullable<> types.
 */
export function unpackNamedType(type: GraphQLType): { type: GraphQLNamedType; prefix: string; suffix: string } {
  if (isNamedType(type)) {
    return {
      type,
      prefix: '',
      suffix: ' | null',
    };
  }

  const unpacked = unpackNamedType(type.ofType);

  let prefix = '';
  let suffix = '';

  if (isListType(type)) {
    prefix = 'Array<';
    suffix = '> | null';
  }

  if (isNonNullType(type)) {
    prefix = 'NonNullable<';
    suffix = '>';
  }

  return {
    type: unpacked.type,
    prefix: prefix + unpacked.prefix,
    suffix: unpacked.suffix + suffix,
  };
}

export function camelCase(str: string) {
  return str.replace(/[-_](.)/g, (_, c) => c.toUpperCase()).replace(/[-_]/g, '');
}

export function getDuplicates<T>(items: T[]) {
  const duplicates: T[] = [];

  for (const item of items) {
    if (duplicates.includes(item)) {
      continue;
    }

    if (items.filter(i => i === item).length > 1) {
      duplicates.push(item);
    }
  }

  return duplicates;
}
