import { WebhookHandlers } from '@teifi-digital/shopify-app-express/services/webhooks.js';
import { db } from './db/db.js';
import { AppPlanName } from './db/queries/generated/app-plan.sql.js';
import { AppSubscriptionStatus } from './gql/queries/generated/schema.js';
import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { syncLocationsIfExists } from './locations/sync.js';
import { syncCustomersIfExists } from './customer/sync.js';
import { syncProductsIfExists } from './products/sync.js';
import { syncProductVariantsIfExists } from './product-variants/sync.js';
import { syncShopifyOrders, syncShopifyOrdersIfExists } from './shopify-order/sync.js';
import { syncWorkOrders } from './work-orders/sync.js';
import { WORK_ORDER_CUSTOM_ATTRIBUTE_NAME } from '@work-orders/work-order-shopify-order';

export default {
  APP_UNINSTALLED: {
    async handler(_session, _topic, shop) {
      await db.shopifySession.removeByShop({ shop });
      await db.appPlan.removeByShop({ shop });
    },
  },

  APP_SUBSCRIPTIONS_UPDATE: {
    async handler(
      _session,
      _topic,
      shop,
      payload: {
        app_subscription: {
          admin_graphql_api_id: ID;
          name: `${number}-${AppPlanName}`;
          status: AppSubscriptionStatus;
          admin_graphql_api_shop_id: ID;
          created_at: string;
          updated_at: string;
          currency: string;
          capped_amount: string;
        };
      },
    ) {
      const appPlanId = payload.app_subscription.name.split('-')[0];
      if (appPlanId == null) throw new Error(`Unable to extract plan id from '${payload.app_subscription.name}'`);

      const appSubscriptionShopifyId = payload.app_subscription.admin_graphql_api_id;
      const [appPlanSubscription] = await db.appPlan.getSubscription({ shop });

      // If the (new) subscription is active or the subscription id matches the current subscription,
      // update the subscription
      if (
        payload.app_subscription.status === 'ACTIVE' ||
        appPlanSubscription?.appSubscriptionShopifyId === appSubscriptionShopifyId
      ) {
        await db.appPlan.upsertSubscription({
          shop,
          appSubscriptionShopifyId,
          appSubscriptionStatus: payload.app_subscription.status,
          appPlanId: Number(appPlanId),
        });
      }
    },
  },

  ORDERS_CREATE: {
    async handler(
      session,
      topic,
      shop,
      body: {
        admin_graphql_api_id: ID;
        note_attributes: { name: string; value: string }[];
      },
    ) {
      const isWorkOrder = body.note_attributes.some(({ name }) => name === WORK_ORDER_CUSTOM_ATTRIBUTE_NAME);

      if (isWorkOrder) {
        await syncShopifyOrders(session, [body.admin_graphql_api_id]);
      }
    },
  },

  LOCATIONS_UPDATE: {
    async handler(session, topic, shop, body: { admin_graphql_api_id: ID }) {
      await syncLocationsIfExists(session, [body.admin_graphql_api_id]);
    },
  },

  LOCATIONS_DELETE: {
    async handler(_session, _topic, _shop, body: { admin_graphql_api_id: ID }) {
      await db.locations.softDeleteLocations({ locationIds: [body.admin_graphql_api_id] });
    },
  },

  CUSTOMERS_UPDATE: {
    async handler(session, topic, shop, body: { admin_graphql_api_id: ID }) {
      await syncCustomersIfExists(session, [body.admin_graphql_api_id]);
    },
  },

  CUSTOMERS_DELETE: {
    async handler(_session, _topic, _shop, body: { admin_graphql_api_id: ID }) {
      await db.customers.softDeleteCustomers({ customerIds: [body.admin_graphql_api_id] });
    },
  },

  PRODUCTS_UPDATE: {
    async handler(session, topic, shop, body: { admin_graphql_api_id: ID; variant_ids: { id: number }[] }) {
      await syncProductsIfExists(session, [body.admin_graphql_api_id]);

      const variantIds = body.variant_ids.map(({ id }) => createGid('ProductVariant', id));
      await syncProductVariantsIfExists(session, variantIds);
    },
  },

  PRODUCTS_DELETE: {
    async handler(_session, _topic, _shop, body: { admin_graphql_api_id: ID }) {
      await db.productVariants.softDeleteProductVariantsByProductId({ productId: body.admin_graphql_api_id });
      await db.products.softDeleteProducts({ productIds: [body.admin_graphql_api_id] });
    },
  },

  DRAFT_ORDERS_UPDATE: {
    async handler(session, topic, shop, body: { admin_graphql_api_id: ID }) {
      await syncShopifyOrdersIfExists(session, [body.admin_graphql_api_id]);
    },
  },

  DRAFT_ORDERS_DELETE: {
    async handler(session, topic, shop, body: { admin_graphql_api_id: ID }) {
      const relatedWorkOrders = await db.shopifyOrder.getRelatedWorkOrdersByShopifyOrderId({
        orderId: body.admin_graphql_api_id,
      });

      await db.shopifyOrder.deleteLineItemsByOrderIds({ orderIds: [body.admin_graphql_api_id] });
      await db.shopifyOrder.deleteOrders({ orderIds: [body.admin_graphql_api_id] });

      await syncWorkOrders(
        session,
        relatedWorkOrders.map(({ id }) => id),
      );
    },
  },

  ORDERS_UPDATED: {
    async handler(session, topic, shop, body: { admin_graphql_api_id: ID }) {
      await syncShopifyOrdersIfExists(session, [body.admin_graphql_api_id]);
    },
  },

  ORDERS_DELETE: {
    async handler(session, topic, shop, body: { admin_graphql_api_id: ID }) {
      // not sure how order deletion is even possible, but it will definitely lead to loss of payment data.
      // soft delete is not a good option here either, because unpaid work order line items would remain linked to order line items in a deleted order, making them unpayable.
      // tldr dont delete orders

      const relatedWorkOrders = await db.shopifyOrder.getRelatedWorkOrdersByShopifyOrderId({
        orderId: body.admin_graphql_api_id,
      });

      await db.shopifyOrder.deleteLineItemsByOrderIds({ orderIds: [body.admin_graphql_api_id] });
      await db.shopifyOrder.deleteOrders({ orderIds: [body.admin_graphql_api_id] });

      await syncWorkOrders(
        session,
        relatedWorkOrders.map(({ id }) => id),
      );
    },
  },
} as WebhookHandlers;
