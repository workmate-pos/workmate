import { sqlOne } from '../db/sql-tag.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { escapeTransaction } from '../db/client.js';

/**
 * Get a count, incrementing it by one if it exists, or creating it if it does not exist.
 */
export async function getCount(key: string, initialValue: number = 1): Promise<number> {
  // We must escape transactions here because we never want to rollback counter increments
  return await escapeTransaction(() =>
    sqlOne<{ lastValue: number }>`
        INSERT INTO "Counter" (key, last_value)
        VALUES (${key}, ${initialValue})
        ON CONFLICT (key)
            DO UPDATE SET last_value = "Counter".last_value + 1
        RETURNING last_value AS "lastValue";
    `.then(result => result.lastValue),
  );
}
