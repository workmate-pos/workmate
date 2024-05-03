import { db } from '../../db.js';
import { groupBy } from '@teifi-digital/shopify-app-toolbox/array';
import { cleanManyOrphanedDraftOrders } from '../../../work-orders/clean-orphaned-draft-orders.js';
import { syncShopifyOrdersIfExists } from '../../../shopify-order/sync.js';
import { assertGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { shopifySessionToSession } from '../../../shopify-sessions.js';

/**
 * Runs {@link syncShopifyOrders} on all known orders.
 * Needed because was a bug related to work order item <-> order line item linking that left pretty much all items unlinked.
 * Here we sync shopify orders from old to new in sequence (but parallel for all shops).
 */
export default async function migrate() {
  const orders = await db.migrations.resyncOrders.getAllOrders();

  const ordersByShop = groupBy(orders, order => order.shop);

  console.log(`Syncing ${orders.length} orders`);

  let successCount = 0;

  await Promise.all(
    Object.entries(ordersByShop).map(async ([shop, orders]) => {
      const [shopifySession] = await db.shopifySession.get({ shop });

      if (!shopifySession) {
        console.error(`No session found for shop ${shop}`);
        return;
      }

      const session = shopifySessionToSession(shopifySession);

      for (const order of orders) {
        const { orderId } = order;

        assertGid(orderId);

        const relatedWorkOrders = await db.shopifyOrder.getRelatedWorkOrdersByShopifyOrderId({ orderId });

        await cleanManyOrphanedDraftOrders(
          session,
          relatedWorkOrders.map(wo => wo.id),
          async () => syncShopifyOrdersIfExists(session, [orderId]),
        );

        successCount++;
      }
    }),
  );

  console.log(`Successfully synced ${successCount} / ${orders.length} orders`);
}
