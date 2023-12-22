import { z } from 'zod';

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type CustomAttributes = { key: string; value: string | null }[];

export type CustomAttributeValue<T extends CustomAttribute<any, any, any>> = T extends CustomAttribute<
  any,
  any,
  infer V
>
  ? V
  : never;

/**
 * Class used to define a custom attribute, including its key, type, and how to serialize & deserialize it.
 *
 * A Zod schema defines valid values for the attribute.
 * Additionally, a `migrate` function can be provided to migrate values to a latest version in case versioning is needed.
 *
 */
export class CustomAttribute<
  const Key extends string,
  const ZodSchemaType extends z.Schema<Json>,
  const Value extends Json,
> {
  /**
   * Finds a custom attribute by key. While attributes are laid out as an array, Shopify ensures every key is unique.
   */
  static findAttribute<const K extends string>(
    key: K,
    attributes?: CustomAttributes | null,
  ): { key: K; value: string } | null {
    return attributes?.find((attribute): attribute is { key: K; value: string } => attribute.key === key) ?? null;
  }

  constructor(
    public readonly key: Key,
    public readonly schema: ZodSchemaType,
    public readonly migrate: (value: z.infer<ZodSchemaType>) => Value,
  ) {}

  serialize(value: Value): { key: Key; value: string } {
    return { key: this.key, value: JSON.stringify(value) };
  }

  deserialize(value: { key: Key; value: string }) {
    const obj = JSON.parse(value.value);
    return this.migrate(this.schema.parse(obj));
  }

  /**
   * Finds an attribute, deserializes it, and migrates it to the latest version.
   * If you do not want deserialization or migration, use {@link CustomAttribute.findAttribute}
   */
  findAttribute(attributes?: CustomAttributes | null): Value | null {
    const attribute = CustomAttribute.findAttribute(this.key, attributes);
    return attribute ? this.deserialize(attribute) : null;
  }
}
