import { WebhookHandlers } from '@teifi-digital/shopify-app-express/services';
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
import { isDepositDiscountCode, WORK_ORDER_CUSTOM_ATTRIBUTE_NAME } from '@work-orders/work-order-shopify-order';
import { assertMoney, BigDecimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';

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

  // 15:32:55 │ web-backend  │ [
  // 15:32:55 │ web-backend  │   {
  // 15:32:55 │ web-backend  │     target_type: 'line_item',
  // 15:32:55 │ web-backend  │     type: 'manual',
  // 15:32:55 │ web-backend  │     value: '1.0',
  // 15:32:55 │ web-backend  │     value_type: 'fixed_amount',
  // 15:32:55 │ web-backend  │     allocation_method: 'across',
  // 15:32:55 │ web-backend  │     target_selection: 'all',
  // 15:32:55 │ web-backend  │     title: 'asd',
  // 15:32:55 │ web-backend  │     description: 'asd'
  // 15:32:55 │ web-backend  │   }
  // 15:32:55 │ web-backend  │ ]
  // 15:32:55 │ web-backend  │ [ { code: 'asd', amount: '1.00', type: 'fixed_amount' } ]

  // 15:34:22 │ web-backend  │ [
  // 15:34:22 │ web-backend  │   {
  // 15:34:22 │ web-backend  │     target_type: 'line_item',
  // 15:34:22 │ web-backend  │     type: 'manual',
  // 15:34:22 │ web-backend  │     value: '12.0',
  // 15:34:22 │ web-backend  │     value_type: 'percentage',
  // 15:34:22 │ web-backend  │     allocation_method: 'across',
  // 15:34:22 │ web-backend  │     target_selection: 'all',
  // 15:34:22 │ web-backend  │     title: 'asdaasdad',
  // 15:34:22 │ web-backend  │     description: 'asdaasdad'
  // 15:34:22 │ web-backend  │   }
  // 15:34:22 │ web-backend  │ ]
  // 15:34:22 │ web-backend  │ [ { code: 'asdaasdad', amount: '107.99', type: 'percentage' } ]

  ORDERS_CREATE: {
    async handler(
      session,
      topic,
      shop,
      body: {
        admin_graphql_api_id: ID;
        note_attributes: { name: string; value: string }[];
        discount_codes: { code: string; amount: Money; type: 'fixed_amount' | 'percentage' }[];
        line_items: { properties: { name: string; value: string | null }[] }[];
      },
    ) {
      const isWorkOrder = body.note_attributes.some(({ name }) => name === WORK_ORDER_CUSTOM_ATTRIBUTE_NAME);

      console.log(body.line_items.map(li => li.properties));

      if (isWorkOrder) {
        // TODO: Just use some special line item for deposits so we can easily track them
        // TODO: Then also store discounts in the db so we can easily calculate the reconciled amount?

        const [workOrder] = await db.workOrder.get({ name: body.admin_graphql_api_id });

        if (workOrder) {
          let { depositedAmount, depositedReconciledAmount } = workOrder;

          assertMoney(depositedAmount);
          assertMoney(depositedReconciledAmount);

          const depositDiscountAmount = BigDecimal.sum(
            ...body.discount_codes
              .filter(isDepositDiscountCode)
              .map(discountCode => BigDecimal.fromMoney(discountCode.amount)),
          );

          if (depositDiscountAmount.compare(BigDecimal.ZERO) > 0) {
            depositedReconciledAmount = BigDecimal.sum(
              BigDecimal.fromMoney(depositedReconciledAmount),
              depositDiscountAmount,
            ).toMoney();
          }
        }

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

  DRAFT_ORDERS_CREATE: {
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

  DRAFT_ORDERS_UPDATE: {
    async handler(session, topic, shop, body: { admin_graphql_api_id: ID }) {
      await syncShopifyOrdersIfExists(session, [body.admin_graphql_api_id]);
    },
  },

  DRAFT_ORDERS_DELETE: {
    async handler(session, topic, shop, body: { id: number }) {
      const orderId = createGid('DraftOrder', body.id);

      const relatedWorkOrders = await db.shopifyOrder.getRelatedWorkOrdersByShopifyOrderId({ orderId });

      await db.shopifyOrder.deleteLineItemsByOrderIds({ orderIds: [orderId] });
      await db.shopifyOrder.deleteOrders({ orderIds: [orderId] });

      await syncWorkOrders(
        session,
        relatedWorkOrders.map(({ id }) => id),
        false,
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
        false,
      );
    },
  },
} as WebhookHandlers;
