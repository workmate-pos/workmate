import { v4 } from 'uuid';

export type UUID = string & { __brand: 'UUID' };

/**
 * Uuid with fallback rng because shopify sucks
 * IMPORTANT: This is NOT a cryptographically secure random number generator.
 * @TODO: Remove this, use @teifi-digital/pos-tools/util/uuid instead after upgrading POS ui version
 */
export function uuid() {
  // shopify sometimes has crypto, sometimes does not. why? who knows.
  const rng =
    typeof crypto === 'undefined'
      ? () => Array.from({ length: 16 }, () => Math.floor(Math.random() * 256))
      : () => [...crypto.getRandomValues(new Uint8Array(16))];

  return v4({ rng }) as UUID;
}
