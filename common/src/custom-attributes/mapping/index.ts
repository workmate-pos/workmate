import { CustomAttribute } from '../CustomAttribute.js';

/**
 * Maps a Record<string, Json> to Record<string, Attribute that serializes that JSON>.
 * Ensures that all mappings are covered, which ensures that cart attributes match order attributes perfectly.
 */
export type AttributeMapping<T extends Record<string, any>> = T extends { [K: string]: unknown }
  ? { [K in keyof T]: CustomAttribute<any, T[K]> }
  : never;

/**
 * Converts a record of attributes into a property record (used for cart attributes).
 */
export function attributesToProperties<T extends AttributeMapping<any>>(
  mapping: T,
  attributes: T extends AttributeMapping<infer U> ? U : never,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(attributes)
      .filter(([, lineItemAttributeValue]) => lineItemAttributeValue !== null)
      .map(([lineItemAttributeKey, lineItemAttributeValue]) => {
        const Attribute = mapping[lineItemAttributeKey as keyof typeof mapping]!;
        const { key, value } = Attribute.serialize(lineItemAttributeValue as any);
        return [key, value];
      }),
  );
}

/**
 * Converts a record of attributes into an array of key-value pairs (used for GraphQL).
 */
export function attributesToArray<T extends Record<string, any>>(
  mapping: AttributeMapping<T>,
  attributes: T,
): Array<{ key: string; value: string }> {
  return Object.entries(attributes)
    .filter(([, lineItemAttributeValue]) => lineItemAttributeValue !== null)
    .map(([lineItemAttributeKey, lineItemAttributeValue]) => {
      const Attribute = mapping[lineItemAttributeKey as keyof typeof mapping]!;
      const { key, value } = Attribute.serialize(lineItemAttributeValue as any);
      return { key, value };
    });
}