import { z } from 'zod';
import { CustomAttribute } from './CustomAttribute.js';

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/**
 * Class used to define a custom attribute, including its key, type, and how to serialize & deserialize it.
 *
 * A Zod schema defines valid values for the attribute.
 * Additionally, a `migrate` function can be provided to migrate values to a latest version in case versioning is needed.
 *
 */
export class JsonAttribute<
  const Key extends string,
  const ZodSchemaType extends z.Schema<Json>,
  const Value extends Json,
> extends CustomAttribute<Key, Value> {
  constructor(
    key: Key,
    public readonly schema: ZodSchemaType,
    public readonly migrate: (value: z.infer<ZodSchemaType>) => Value,
  ) {
    super(key);
  }

  serialize(value: Value): { key: Key; value: string } {
    return { key: this.key, value: JSON.stringify(value) };
  }

  deserialize(value: { key: Key; value: string }) {
    const obj = JSON.parse(value.value);
    return this.migrate(this.schema.parse(obj));
  }
}
