/**
 * Utility to indicate that something should never happen.
 * If it does, it will throw an error.
 * Throwing indicates that there is probably a bug or wrong assumption somewhere.
 *
 * Can be used as to narrow types when TypeScript does not understand something but you do.
 * @example const [customer = never()] = await db.customer.getWorkOrderCustomer({ workOrderId: 1 })
 */
export function never(message?: string): never {
  throw new Error(message ?? 'Reached an impossible state');
}
