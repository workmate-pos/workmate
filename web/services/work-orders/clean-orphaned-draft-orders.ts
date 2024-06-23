import { db } from '../db/db.js';
import { Session } from '@shopify/shopify-api';
import { Graphql, sentryErr } from '@teifi-digital/shopify-app-express/services';
import { gql } from '../gql/gql.js';
import { assertGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { inTransaction } from '../db/client.js';
import { recompose } from '../../util/functional.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';

/**
 * Simple wrapper function that tracks draft orders before and after some async operation, and cleans those that are no longer referenced by any work order item/charge.
 * IMPORTANT: This should not be called inside a transaction! Deleting draft orders triggers a webhook which depends on database state!
 */
export async function cleanOrphanedDraftOrders<T>(
  session: Session,
  workOrderId: number,
  fn: () => Promise<T>,
): Promise<T> {
  if (inTransaction()) {
    throw new Error('cleanOrphanedDraftOrders should not be called inside a transaction!');
  }

  const oldLinkedOrders = await db.shopifyOrder.getLinkedOrdersByWorkOrderId({ workOrderId });

  async function clean() {
    const newLinkedOrders = await db.shopifyOrder.getLinkedOrdersByWorkOrderId({ workOrderId });
    const orphanedDraftOrders = oldLinkedOrders
      .filter(hasPropertyValue('orderType', 'DRAFT_ORDER'))
      .filter(({ orderId }) => !newLinkedOrders.some(({ orderId: id }) => id === orderId));

    if (orphanedDraftOrders.length === 0) {
      return;
    }

    const graphql = new Graphql(session);
    await gql.draftOrder.removeMany
      .run(graphql, {
        ids: orphanedDraftOrders.map(({ orderId }) => {
          assertGid(orderId);
          return orderId;
        }),
      })
      .catch(error => sentryErr(error));
  }

  return await fn().then(
    result => clean().then(() => result),
    error => clean().then(() => Promise.reject(error)),
  );
}

/**
 * Just like {@link cleanOrphanedDraftOrders}, but accepts an array of work order ids.
 */
export function cleanManyOrphanedDraftOrders<T>(session: Session, workOrderIds: number[], fn: () => Promise<T>) {
  const run = recompose(workOrderIds, (workOrderId, next) => cleanOrphanedDraftOrders(session, workOrderId, next), fn);
  return run();
}
