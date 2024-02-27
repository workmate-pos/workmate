import { WebhookHandlers } from '@teifi-digital/shopify-app-express/services/webhooks.js';
import { db } from './db/db.js';
import { WorkOrderAttribute } from '@work-orders/common/custom-attributes/attributes/WorkOrderAttribute.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { AppPlanName } from './db/queries/generated/app-plan.sql.js';
import { AppSubscriptionStatus } from './gql/queries/generated/schema.js';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { gql } from './gql/gql.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';

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
        admin_graphql_api_id: string;
        note_attributes: { name: string; value: string }[];
      },
    ) {
      const rawWorkOrderName = body.note_attributes.find(({ name }) => name === WorkOrderAttribute.key)?.value;

      if (!rawWorkOrderName) {
        return;
      }

      const workOrderName = WorkOrderAttribute.deserialize({ key: WorkOrderAttribute.key, value: rawWorkOrderName });

      const [workOrder = never()] = await db.workOrder.get({ shop, name: workOrderName });

      await db.workOrder.updateOrderIds({
        id: workOrder.id,
        orderId: body.admin_graphql_api_id,
        draftOrderId: null,
      });

      if (workOrder.draftOrderId) {
        assertGid(workOrder.draftOrderId);
        const graphql = new Graphql(session);
        await gql.draftOrder.remove.run(graphql, { id: workOrder.draftOrderId });
      }
    },
  },
} as WebhookHandlers;
