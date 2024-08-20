import { sqlOne } from '../db/sql-tag.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';

/**
 * Get a count, incrementing it by one if it exists, or creating it if it does not exist.
 * @todo: escape transaction here
 */
export async function getCount(key: string, initialValue: number = 1): Promise<number> {
  const { lastValue } = await sqlOne<{ lastValue: number | null }>`
    INSERT INTO "Counter" (key, last_value)
    VALUES (${key}, ${initialValue})
    ON CONFLICT (key)
      DO UPDATE SET last_value = "Counter".last_value + 1
    RETURNING last_value AS "lastValue";`;

  return lastValue ?? never();
}
