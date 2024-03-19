import { db } from '../db/db.js';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { gql } from '../gql/gql.js';
import { assertGid } from '@teifi-digital/shopify-app-toolbox/shopify';

/**
 * Simple wrapper function that tracks draft orders before and after some async operation, and cleans those that are no longer referenced by any work order item/charge.
 */
export async function cleanOrphanedDraftOrders<T>(
  session: Session,
  workOrderId: number,
  fn: () => Promise<T>,
): Promise<T> {
  const oldLinkedDraftOrders = await db.shopifyOrder.getLinkedOrdersByWorkOrderId({ workOrderId });

  async function clean() {
    const newLinkedDraftOrders = await db.shopifyOrder.getLinkedOrdersByWorkOrderId({ workOrderId });
    const orphanedDraftOrders = oldLinkedDraftOrders.filter(
      ({ orderId }) => !newLinkedDraftOrders.some(({ orderId: id }) => id === orderId),
    );

    const graphql = new Graphql(session);
    await gql.draftOrder.removeMany.run(graphql, {
      ids: orphanedDraftOrders.map(({ orderId }) => {
        assertGid(orderId);
        return orderId;
      }),
    });
  }

  return await fn().then(
    result => clean().then(() => result),
    error => clean().then(() => Promise.reject(error)),
  );
}
