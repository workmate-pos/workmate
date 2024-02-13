/**
 * A cache that removes keys after a certain amount of time after being set.
 */
export class CacheMap<K, V> implements Map<K, V> {
  protected map = new Map<K, { value: V; timeout: NodeJS.Timeout }>();

  constructor(public ttl: number) {}

  get [Symbol.toStringTag]() {
    return 'CacheMap';
  }

  get size() {
    return this.map.size;
  }

  *[Symbol.iterator](): IterableIterator<[K, V]> {
    for (const [key, { value }] of this.map) {
      yield [key, value];
    }
  }

  clear(): void {
    for (const { timeout } of this.map.values()) {
      clearTimeout(timeout);
    }
    this.map.clear();
  }

  delete(key: K): boolean {
    const entry = this.map.get(key);
    if (entry) {
      clearTimeout(entry.timeout);
      this.map.delete(key);
      return true;
    }
    return false;
  }

  entries(): IterableIterator<[K, V]> {
    return this[Symbol.iterator]();
  }

  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
    for (const [key, { value }] of this.map) {
      callbackfn.call(thisArg, value, key, this);
    }
  }

  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (entry) {
      return entry.value;
    }
    return undefined;
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  keys(): IterableIterator<K> {
    return this.map.keys();
  }

  set(key: K, value: V): this {
    const entry = this.map.get(key);
    if (entry) {
      clearTimeout(entry.timeout);
    }
    const timeout = setTimeout(() => {
      this.delete(key);
    }, this.ttl);
    this.map.set(key, { value, timeout });
    return this;
  }

  *values(): IterableIterator<V> {
    for (const { value } of this.map.values()) {
      yield value;
    }
  }
}
