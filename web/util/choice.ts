/**
 * Returns the key that holds `true` in the given object.
 * Throws an error if there is not exactly one key with `true`.
 * Can be handy to prevent complicated conditionals, while at the same time asserting you made no mistakes.
 */
export function findSoleTruth<const K extends string>(choices: Record<K, boolean>) {
  const trueKeys = Object.keys(choices).filter(key => choices[key as K]);

  if (trueKeys.length !== 1) {
    throw new Error(`Expected exactly one key to be true, but got ${trueKeys.length} (${trueKeys.join(', ')})`);
  }

  return trueKeys[0] as K;
}
