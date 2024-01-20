import { CustomAttribute } from './CustomAttribute.js';

export class StringAttribute<const Key extends string> extends CustomAttribute<Key, string> {
  constructor(key: Key) {
    super(key);
  }

  serialize(value: string): { key: Key; value: string } {
    return { key: this.key, value: value };
  }

  deserialize(value: { key: Key; value: string }): string {
    return value.value;
  }
}
