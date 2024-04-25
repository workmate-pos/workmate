import { inTransaction } from './client.js';
import { transaction } from './transaction.js';

/**
 * Creates a transactional context if it does not already exist.
 * Similar to {@link transaction}, but cannot control the isolation level nor return {@link TransactionRollback} as it is not guaranteed to control the transaction.
 *
 * Should be preferred over {@link transaction} as this supports nesting.
 */
export async function unit<T>(unit: () => Promise<T>) {
  if (inTransaction()) {
    return await unit();
  }

  return await transaction(unit);
}
