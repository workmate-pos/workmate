export type CustomAttributes = { key: string; value: string | null }[];
export type CustomAttributeValue<T extends CustomAttribute<any, any>> = T extends CustomAttribute<any, infer V>
  ? V
  : never;

export abstract class CustomAttribute<const Key extends string, const Value> {
  protected constructor(public readonly key: Key) {}

  /**
   * Finds a custom attribute by key.
   * While `attributes` is an array, Shopify ensures every key is unique.
   */
  static findAttribute<const K extends string>(
    key: K,
    attributes?: CustomAttributes | null,
  ): { key: K; value: string } | null {
    return attributes?.find((attribute): attribute is { key: K; value: string } => attribute.key === key) ?? null;
  }

  abstract serialize(value: Value): { key: Key; value: string };
  abstract deserialize(value: { key: Key; value: string }): Value;

  /**
   * Finds an attribute, deserializes it, and migrates it to the latest version.
   * If you do not want deserialization or migration, use {@link CustomAttribute.findAttribute}
   */
  findAttribute(attributes?: CustomAttributes | null): Value | null {
    const attribute = CustomAttribute.findAttribute(this.key, attributes);
    return attribute ? this.deserialize(attribute) : null;
  }
}
