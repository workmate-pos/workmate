import { sentryErr, WebhookHandlers } from '@teifi-digital/shopify-app-express/services';
import { db } from './db/db.js';
import { AppPlanName } from './db/queries/generated/app-plan.sql.js';
import { AppSubscriptionStatus, DateTime } from './gql/queries/generated/schema.js';
import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { syncLocationsIfExists } from './locations/sync.js';
import { syncCustomersIfExists } from './customer/sync.js';
import { syncProducts } from './products/sync.js';
import { syncProductVariants } from './product-variants/sync.js';
import { syncShopifyOrders, syncShopifyOrdersIfExists } from './shopify-order/sync.js';
import { syncWorkOrders } from './work-orders/sync.js';
import { WORK_ORDER_CUSTOM_ATTRIBUTE_NAME } from '@work-orders/work-order-shopify-order';
import {
  productServiceTypeMetafield,
  syncProductServiceTypeTag,
  syncProductServiceTypeTagWithServiceType,
} from './metafields/product-service-type-metafield.js';
import { cleanManyOrphanedDraftOrders, cleanOrphanedDraftOrders } from './work-orders/clean-orphaned-draft-orders.js';
import { unit } from './db/unit-of-work.js';
import { getWorkOrder } from './work-orders/queries.js';
import { unreserveLineItem } from './sourcing/reserve.js';
import { getProduct, softDeleteProducts } from './products/queries.js';
import { softDeleteProductVariantsByProductIds } from './product-variants/queries.js';
import { doesProductHaveSyncableMetafields } from './metafields/sync.js';
import { getReorderPoints } from './reorder/queries.js';
import { hasNonNullableProperty } from '@teifi-digital/shopify-app-toolbox/guards';
import {
  productSerialNumbersMetafield,
  setProductUsesSerialNumbersTag,
  syncProductUsesSerialNumbersTag,
} from './metafields/product-serial-numbers-metafield.js';
import { resolveNamespace } from './app/index.js';
import { parseProductServiceType } from '@work-orders/common/metafields/product-service-type.js';

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
      const workOrderName = body.note_attributes.find(({ name }) => name === WORK_ORDER_CUSTOM_ATTRIBUTE_NAME);

      if (workOrderName) {
        const workOrder = await getWorkOrder({ shop: session.shop, name: workOrderName.value, locationIds: null });

        if (!workOrder) {
          // can happen if a merchant manually adds the attribute. if this happens often something is wrong
          sentryErr('Order with Work Order Attribute not found in db', {
            shop: session.shop,
            workOrderName,
            orderId: body.admin_graphql_api_id,
          });
          return;
        }

        await cleanOrphanedDraftOrders(session, workOrder.id, () =>
          syncShopifyOrders(session, [body.admin_graphql_api_id]),
        );
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
    init: {
      metafieldNamespaces: ['$app'],
    },
    async handler(
      session,
      topic,
      shop,
      body: {
        admin_graphql_api_id: ID;
        variant_ids: { id: number }[];
        // this is a string of comma separated tags. that obviously breaks when the tag contains commas but whatever
        tags: string;
        variants: {
          inventory_item_id: number | null | undefined;
        }[];
        metafields?: {
          id: number;
          namespace: string;
          key: string;
          value: unknown;
          description: string | null;
          owner_id: number;
          created_at: DateTime;
          updated_at: DateTime;
          owner_resource: string;
          type: string;
          admin_graphql_api_id: ID;
        }[];
      },
    ) {
      const getMetafield = ({ namespace, key }: { namespace: string; key: string }) =>
        Promise.all(
          body.metafields?.map(
            async metafield =>
              [
                metafield,
                metafield.key === key && metafield.namespace === (await resolveNamespace(session, namespace)),
              ] as const,
          ) ?? [],
        ).then(x => x.find(([, isProductServiceType]) => isProductServiceType)?.[0]);

      const serviceTypeMetafield = await getMetafield(productServiceTypeMetafield);
      const usesSerialNumbersMetafield = await getMetafield(productSerialNumbersMetafield);

      const tags = body.tags.split(', ');

      const changed = await Promise.all([
        syncProductServiceTypeTagWithServiceType(
          session,
          body.admin_graphql_api_id,
          tags,
          serviceTypeMetafield?.value ? parseProductServiceType(String(serviceTypeMetafield?.value)) : null,
        ),
        setProductUsesSerialNumbersTag(
          session,
          body.admin_graphql_api_id,
          tags,
          Boolean(usesSerialNumbersMetafield?.value ?? false),
        ),
      ]).then(results => results.some(changed => changed));

      if (changed) {
        // wait for the next webhook before syncing to save some query cost
        return;
      }

      const [isCached, hasSyncableMetafields, hasReorderPoints] = await Promise.all([
        getProduct(body.admin_graphql_api_id).then(product => product !== null),
        false,
        // doesProductHaveSyncableMetafields(session, body.admin_graphql_api_id),
        getReorderPoints({
          shop: session.shop,
          inventoryItemIds: body.variants
            .filter(hasNonNullableProperty('inventory_item_id'))
            .map(({ inventory_item_id }) => createGid('InventoryItem', inventory_item_id)),
        }).then(points => points.length > 0),
      ]);

      const shouldSync = isCached || hasSyncableMetafields || hasReorderPoints;

      if (shouldSync) {
        await syncProducts(session, [body.admin_graphql_api_id]);
        const variantIds = body.variant_ids.map(({ id }) => createGid('ProductVariant', id));
        await syncProductVariants(session, variantIds);
      }
    },
  },

  PRODUCTS_DELETE: {
    async handler(_session, _topic, _shop, body: { admin_graphql_api_id: ID }) {
      await softDeleteProductVariantsByProductIds([body.admin_graphql_api_id]);
      await softDeleteProducts([body.admin_graphql_api_id]);
    },
  },

  DRAFT_ORDERS_UPDATE: {
    async handler(
      session,
      topic,
      shop,
      body: {
        admin_graphql_api_id: ID;
        name: string;
        order_id: string | null;
      },
    ) {
      async function sync() {
        const relatedWorkOrders = await db.shopifyOrder.getRelatedWorkOrdersByShopifyOrderId({
          orderId: body.admin_graphql_api_id,
        });

        await cleanManyOrphanedDraftOrders(
          session,
          relatedWorkOrders.map(({ id }) => id),
          () => syncShopifyOrdersIfExists(session, [body.admin_graphql_api_id]),
        );
      }

      async function removeReservations() {
        if (body.order_id === null) {
          return;
        }

        // We want to remove all reservations the moment the draft order is converted into a real order
        // because real orders will set the inventory state to committed until fulfillment.
        // So we must get rid of the "reserved" state for reserved items

        const lineItems = await db.shopifyOrder.getLineItems({ orderId: body.admin_graphql_api_id });

        if (!lineItems.length) {
          return;
        }

        // TODO: Bulk
        await Promise.all(
          lineItems.map(lineItem => unreserveLineItem(session, { lineItemId: lineItem.lineItemId as ID })),
        );
      }

      await Promise.all([sync(), removeReservations()]);
    },
  },

  DRAFT_ORDERS_DELETE: {
    async handler(session, topic, shop, body: { id: number }) {
      const orderId = createGid('DraftOrder', body.id);

      async function sync() {
        const relatedWorkOrders = await db.shopifyOrder.getRelatedWorkOrdersByShopifyOrderId({ orderId });

        await cleanManyOrphanedDraftOrders(
          session,
          relatedWorkOrders.map(({ id }) => id),
          () =>
            unit(async () => {
              await db.shopifyOrder.deleteLineItemsByOrderIds({ orderIds: [orderId] });
              await db.shopifyOrder.deleteOrders({ orderIds: [orderId] });

              await syncWorkOrders(
                session,
                relatedWorkOrders.map(({ id }) => id),
                { onlySyncIfUnlinked: true, updateCustomAttributes: false },
              );
            }),
        );
      }

      async function removeReservations() {
        const lineItems = await db.shopifyOrder.getLineItems({ orderId: createGid('DraftOrder', body.id) });

        if (!lineItems.length) {
          return;
        }

        await Promise.all(
          lineItems.map(lineItem => unreserveLineItem(session, { lineItemId: lineItem.lineItemId as ID })),
        );
      }

      await Promise.all([sync(), removeReservations()]);
    },
  },

  ORDERS_UPDATED: {
    async handler(
      session,
      topic,
      shop,
      body: {
        admin_graphql_api_id: ID;
        note_attributes: { name: string; value: string }[];
      },
    ) {
      const relatedWorkOrders = await db.shopifyOrder.getRelatedWorkOrdersByShopifyOrderId({
        orderId: body.admin_graphql_api_id,
      });

      if (relatedWorkOrders.length > 0) {
        await cleanManyOrphanedDraftOrders(
          session,
          relatedWorkOrders.map(({ id }) => id),
          () => syncShopifyOrdersIfExists(session, [body.admin_graphql_api_id]),
        );
      } else {
        // No related work orders, maybe the order create webhook failed, so try to create it here

        const workOrderName = body.note_attributes.find(({ name }) => name === WORK_ORDER_CUSTOM_ATTRIBUTE_NAME);

        if (workOrderName) {
          const workOrder = await getWorkOrder({ shop: session.shop, name: workOrderName.value, locationIds: null });

          if (!workOrder) {
            // can happen if a merchant manually adds the attribute. if this happens often something is wrong
            sentryErr('Order with Work Order Attribute not found in db', {
              shop: session.shop,
              workOrderName,
              orderId: body.admin_graphql_api_id,
            });
            return;
          }

          await cleanOrphanedDraftOrders(session, workOrder.id, () =>
            syncShopifyOrders(session, [body.admin_graphql_api_id]),
          );
        }
      }
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

      await cleanManyOrphanedDraftOrders(
        session,
        relatedWorkOrders.map(({ id }) => id),
        () =>
          unit(async () => {
            await db.shopifyOrder.deleteLineItemsByOrderIds({ orderIds: [body.admin_graphql_api_id] });
            await db.shopifyOrder.deleteOrders({ orderIds: [body.admin_graphql_api_id] });

            await syncWorkOrders(
              session,
              relatedWorkOrders.map(({ id }) => id),
              { onlySyncIfUnlinked: true, updateCustomAttributes: false },
            );
          }),
      );
    },
  },
} as WebhookHandlers;
