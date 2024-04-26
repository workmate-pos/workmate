/**
 * This file contains logic required to migrate from single-order work orders to multi-order work orders.
 * This change replaces a WO -> SO relation with a WO line item -> SO line item relation.
 * This means that we must go through all old work orders, fetch them, and create line item relations.
 */

import { db } from '../services/db/db.js';
import {
  IGetAllOldResult,
  IGetFixedServiceCollectionIdSettingsResult,
  IGetMutableServiceCollectionIdSettingsResult,
  IGetPurchaseOrdersResult,
} from '../services/db/queries/generated/work-order-migration.sql.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { gql } from '../services/gql/gql.js';
import { shopifySessionToSession } from '../services/shopify-sessions.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { transaction } from '../services/db/transaction.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { ensureShopifyOrdersExist } from '../services/shopify-order/sync.js';
import { v4 as uuid } from 'uuid';
import { syncProductVariants } from '../services/product-variants/sync.js';
import { ensureCustomersExist } from '../services/customer/sync.js';
import { productServiceTypeMetafield } from '../services/metafields/product-service-type-metafield.js';
import {
  getProductServiceType,
  ProductServiceType,
  QUANTITY_ADJUSTING_SERVICE,
} from '@work-orders/common/metafields/product-service-type.js';

const WOPOS_TEST_STORE = 'work-orders-pos.myshopify.com';
const SHOPIFY_MARKETPLACE_REVIEW_STORE = '62d6a1-2.myshopify.com';
const DELETED_STORE = '50d18c.myshopify.com';
const GOLFHQ = 'mygolfhq.myshopify.com';

const STORES_TO_YEET = [WOPOS_TEST_STORE, SHOPIFY_MARKETPLACE_REVIEW_STORE, DELETED_STORE, GOLFHQ];

const DRY_RUN = true;

export async function migrateServiceItems() {
  // We have moved away from Service collections to metafields + tags.
  // So we should go through the collections for each shop and add the metafield value

  const mutableServiceCollectionIdSettings = await db.workOrderMigration.getMutableServiceCollectionIdSettings();
  const fixedServiceCollectionIdSettings = await db.workOrderMigration.getFixedServiceCollectionIdSettings();

  const collectionIdSettingFilter = (
    setting: IGetMutableServiceCollectionIdSettingsResult | IGetFixedServiceCollectionIdSettingsResult,
  ) => {
    return (
      !STORES_TO_YEET.includes(setting.shop) &&
      !!JSON.parse(setting.value) &&
      typeof JSON.parse(setting.value) === 'string' &&
      JSON.parse(setting.value).trim().length > 0
    );
  };

  const tasks: [
    serviceType: ProductServiceType,
    settings: (IGetMutableServiceCollectionIdSettingsResult | IGetFixedServiceCollectionIdSettingsResult)[],
  ][] = [
    ['Quantity-Adjusting Service', mutableServiceCollectionIdSettings.filter(collectionIdSettingFilter)],
    ['Fixed-Price Service', fixedServiceCollectionIdSettings.filter(collectionIdSettingFilter)],
  ];

  for (const [serviceType, settings] of tasks) {
    console.log(`Migrating ${settings.length} ${serviceType} collections`);

    let successCount = 0;

    for (const [i, collectionSetting] of settings.entries()) {
      const prefix = `[${i + 1} / ${settings.length}] [${collectionSetting.shop}]`;

      const collectionId = JSON.parse(collectionSetting.value) as ID;

      await migrateServiceCollection(collectionSetting.shop, collectionId, serviceType).then(
        () => successCount++,
        error => console.error(prefix, 'Migration failed:', error.message),
      );
    }

    console.log(`Migrated ${successCount} / ${settings.length} ${serviceType} collections`);
  }
}

async function migrateServiceCollection(shop: string, collectionId: ID, serviceType: ProductServiceType) {
  const [shopifySession] = await db.shopifySession.get({ shop, isOnline: false });

  if (!shopifySession) {
    throw new Error('No session available');
  }

  const session = shopifySessionToSession(shopifySession);
  const graphql = new Graphql(session);

  const { collection } = await gql.workOrderMigration.getCollectionProducts.run(graphql, { id: collectionId });

  if (!collection) {
    return;
  }

  if (collection.products.pageInfo.hasNextPage) {
    throw new Error('More than 250 products in collection - increase limit!');
  }

  if (DRY_RUN) {
    return;
  }

  // fetch the metafield id or create it if it hasn't been created yet
  const { metafieldDefinitions } = await gql.workOrderMigration.getServiceTypeMetafieldDefinition.run(graphql, {});

  if (metafieldDefinitions.nodes.length === 0) {
    const { metafieldDefinitionCreate } = await gql.metafields.createDefinition.run(graphql, {
      definition: productServiceTypeMetafield,
    });

    if (!metafieldDefinitionCreate?.createdDefinition) {
      throw new Error('Failed to create service type metafield');
    }
  }

  for (const { id, serviceTypeMetafield } of collection.products.nodes) {
    // after setting metafield the webhook will automatically add the tag 💪
    await gql.workOrderMigration.setProductServiceTypeMetafield.run(graphql, {
      id,
      value: serviceType,
      ...(serviceTypeMetafield
        ? { metafieldId: serviceTypeMetafield.id }
        : { key: productServiceTypeMetafield.key, namespace: productServiceTypeMetafield.namespace }),
    });
  }

  // TODO: Re-add before merge
  // if (serviceType === 'Quantity-Adjusting Service') {
  //   await db.workOrderMigration.deleteShopMutableServiceCollectionIdSetting({ shop });
  // } else if (serviceType === 'Fixed-Price Service') {
  //   await db.workOrderMigration.deleteShopFixedServiceCollectionIdSetting({ shop });
  // } else {
  //   return serviceType satisfies never;
  // }
}

export async function migratePurchaseOrders() {
  // We only had partial product data in the db before. The prisma migration just added placeholder info, so we need to resync product (variants) for all purchase order items.

  for (const shop of STORES_TO_YEET) {
    await db.workOrderMigration.removeShopPurchaseOrderLineItems({ shop });
    await db.workOrderMigration.removePurchaseOrderEmployeeAssignments({ shop });
    await db.workOrderMigration.removeShopPurchaseOrderCustomFields({ shop });
    await db.workOrderMigration.removeShopPurchaseOrders({ shop });
  }

  const purchaseOrders = await db.workOrderMigration.getPurchaseOrders();

  console.log(`Migrating ${purchaseOrders.length} purchase orders`);

  let successCount = 0;

  for (const [i, purchaseOrder] of purchaseOrders.entries()) {
    const prefix = `[${i + 1} / ${purchaseOrders.length}] [${purchaseOrder.id}] [${purchaseOrder.shop}] [${purchaseOrder.name}]`;

    await migratePurchaseOrder(purchaseOrder).then(
      () => successCount++,
      e => console.error(prefix, 'Migration failed:', e.message),
    );
  }

  await db.workOrderMigration.removePlaceholderProductVariants();
  await db.workOrderMigration.removePlaceholderProduct();

  console.log(
    `Purchase order migration completed. Successfully migrated ${successCount} / ${purchaseOrders.length} purchase orders`,
  );
}

async function migratePurchaseOrder(purchaseOrder: IGetPurchaseOrdersResult) {
  const [shopifySession] = await db.shopifySession.get({ shop: purchaseOrder.shop, isOnline: false });

  if (!shopifySession) {
    throw new Error('No session available');
  }

  const session = shopifySessionToSession(shopifySession);

  const lineItems = await db.workOrderMigration.getPurchaseOrderLineItems({ purchaseOrderId: purchaseOrder.id });

  // this will also sync products
  await syncProductVariants(
    session,
    lineItems.map(li => li.productVariantId as ID),
  );
}

export async function migrateWorkOrders() {
  for (const shop of STORES_TO_YEET) {
    await db.workOrderMigration.removeShopOldHourlyLabour({ shop });
    await db.workOrderMigration.removeShopOldFixedPriceLabour({ shop });
    await db.workOrderMigration.removeShopOldWorkOrders({ shop });
  }

  const oldWorkOrders = await db.workOrderMigration.getAllOld();

  console.log(`Migrating ${oldWorkOrders.length} work orders`);

  let successCount = 0;

  for (const [i, workOrder] of oldWorkOrders.entries()) {
    const prefix = `[${i + 1} / ${oldWorkOrders.length}] [${workOrder.id}] [${workOrder.shop}] [${workOrder.name}]`;

    await migrateWorkOrder(workOrder).then(
      () => successCount++,
      e => console.error(prefix, 'Migration failed:', e.message),
    );
  }

  console.log(
    `Work order migration completed. Successfully migrated ${successCount} / ${oldWorkOrders.length} work orders`,
  );
}

async function migrateWorkOrder(oldWorkOrder: IGetAllOldResult) {
  const [shopifySession] = await db.shopifySession.get({ shop: oldWorkOrder.shop, isOnline: false });

  if (!shopifySession) {
    throw new Error('No session available');
  }

  const session = shopifySessionToSession(shopifySession);

  await transaction(async () => {
    const hourlyLabourCharges = await db.workOrderMigration.getOldHourlyLabours({ workOrderId: oldWorkOrder.id });
    const fixedPriceLabourCharges = await db.workOrderMigration.getOldFixedPriceLabours({
      workOrderId: oldWorkOrder.id,
    });

    const graphql = new Graphql(session);

    let note = '';
    let lineItems: (
      | gql.workOrderMigration.OrderLineItemFragment.Result
      | gql.workOrderMigration.DraftOrderLineItemFragment.Result
    )[] = [];

    if (oldWorkOrder.orderId) {
      const { order } = await gql.workOrderMigration.getOrder.run(graphql, { id: oldWorkOrder.orderId as ID });

      if (order) {
        if (order.lineItems.pageInfo.hasNextPage) {
          throw new Error('Didnt fetch all line items. Increase the limit');
        }

        lineItems = order.lineItems.nodes;
        note = order.note ?? '';

        await ensureShopifyOrdersExist(session, [oldWorkOrder.orderId as ID]).catch(() => {});
      }
    } else if (oldWorkOrder.draftOrderId) {
      const { draftOrder } = await gql.workOrderMigration.getDraftOrder.run(graphql, {
        id: oldWorkOrder.draftOrderId as ID,
      });

      if (draftOrder) {
        if (draftOrder.lineItems.pageInfo.hasNextPage) {
          throw new Error('Didnt fetch all line items. Increase the limit');
        }

        lineItems = draftOrder.lineItems.nodes;
        note = draftOrder.note ?? '';

        await ensureShopifyOrdersExist(session, [oldWorkOrder.draftOrderId as ID]);
      }
    }

    await ensureCustomersExist(session, [oldWorkOrder.customerId as ID]);

    if (oldWorkOrder.derivedFromOrderId) {
      await ensureShopifyOrdersExist(session, [oldWorkOrder.derivedFromOrderId as ID]);
    }

    const [newWorkOrder = never()] = await db.workOrderMigration.createNewWorkOrder({
      shop: oldWorkOrder.shop,
      name: oldWorkOrder.name,
      customerId: oldWorkOrder.customerId,
      derivedFromOrderId: oldWorkOrder.derivedFromOrderId,
      dueDate: oldWorkOrder.dueDate,
      status: oldWorkOrder.status,
      note,
    });

    for (const lineItem of lineItems) {
      if (lineItem.variant) {
        // A product or a mutable line item.

        const variantId = lineItem.variant.id;
        const isMutableServiceItem =
          getProductServiceType(lineItem.variant.product.serviceType?.value) === QUANTITY_ADJUSTING_SERVICE;

        const [newWorkOrderItem = never()] = await db.workOrderMigration.createNewWorkOrderItem({
          workOrderId: newWorkOrder.id,
          uuid: uuid(),
          quantity: isMutableServiceItem ? 0 : lineItem.quantity,
          shopifyOrderLineItemId: lineItem.id,
          absorbCharges: isMutableServiceItem,
          productVariantId: variantId,
        });

        if (isMutableServiceItem) {
          const uuids = lineItem.customAttributes.find(ca => ca.key === '_UUIDS')?.value;

          const linkedHourlyLabourCharges = hourlyLabourCharges.filter(hlc => hlc.productVariantId === variantId);
          const linkedFixedPriceLabourCharges = fixedPriceLabourCharges.filter(
            fplc => fplc.productVariantId === variantId,
          );

          if (uuids && JSON.stringify(uuids).length > 1) {
            // we only support one stacked service item (fine for all the things that need migrating)
            throw new Error('Only mutable service items with qty 1 are supported');
          } else if (!uuids) {
            // without a uuid we cannot know the service qty unless there is just one charge (then its guaranteed to be qty 1, which we support)
            if (linkedHourlyLabourCharges.length + linkedFixedPriceLabourCharges.length > 1) {
              throw new Error('Mutable services without UUIDs must have just one linked charge');
            }
          }

          for (const linkedHourlyLabourCharge of linkedHourlyLabourCharges) {
            hourlyLabourCharges.splice(hourlyLabourCharges.indexOf(linkedHourlyLabourCharge), 1);

            await db.workOrderMigration.createNewWorkOrderHourlyLabourCharge({
              workOrderId: newWorkOrder.id,
              uuid: uuid(),
              workOrderItemUuid: newWorkOrderItem.uuid,
              shopifyOrderLineItemId: lineItem.id,
              employeeId: linkedHourlyLabourCharge.employeeId,
              name: linkedHourlyLabourCharge.name,
              rate: linkedHourlyLabourCharge.rate,
              hours: linkedHourlyLabourCharge.hours,
            });
          }

          for (const linkedFixedPriceLabourCharge of linkedFixedPriceLabourCharges) {
            fixedPriceLabourCharges.splice(fixedPriceLabourCharges.indexOf(linkedFixedPriceLabourCharge), 1);

            await db.workOrderMigration.createNewWorkOrderFixedPriceLabourCharge({
              workOrderId: newWorkOrder.id,
              uuid: uuid(),
              workOrderItemUuid: newWorkOrderItem.uuid,
              shopifyOrderLineItemId: lineItem.id,
              employeeId: linkedFixedPriceLabourCharge.employeeId,
              name: linkedFixedPriceLabourCharge.name,
              amount: linkedFixedPriceLabourCharge.amount,
            });
          }
        }
      } else {
        // Custom sale - it must be a charge.
        // Custom attributes:
        // - chargeLineItemUuid (_Charge Line Item UUID)
        // - sku (SKU)
        const chargeLineItemUuid = lineItem.customAttributes.find(ca => ca.key === '_Charge Line Item UUID')?.value;

        if (!chargeLineItemUuid) {
          throw new Error(
            `Migration failed - custom sale without a charge line item uuid - ${lineItem.name} - ${lineItem.customAttributes.map(ca => ca.key)}`,
          );
        }

        const hourlyLabourCharge = hourlyLabourCharges.find(hlc => {
          return (
            hlc.lineItemUuid === chargeLineItemUuid &&
            chargeNameMatchesLineItemName(hlc.name, lineItem.name) &&
            BigDecimal.fromString(hlc.hours)
              .multiply(BigDecimal.fromString(hlc.rate))
              .equals(BigDecimal.fromDecimal(lineItem.originalTotalSet.shopMoney.amount))
          );
        });

        const fixedPriceLabourCharge = fixedPriceLabourCharges.find(
          fplc =>
            fplc.lineItemUuid === chargeLineItemUuid &&
            chargeNameMatchesLineItemName(fplc.name, lineItem.name) &&
            BigDecimal.fromString(fplc.amount).equals(
              BigDecimal.fromDecimal(lineItem.originalTotalSet.shopMoney.amount),
            ),
        );

        if (hourlyLabourCharge) {
          hourlyLabourCharges.splice(hourlyLabourCharges.indexOf(hourlyLabourCharge), 1);

          await db.workOrderMigration.createNewWorkOrderHourlyLabourCharge({
            workOrderId: newWorkOrder.id,
            uuid: uuid(),
            workOrderItemUuid: null,
            shopifyOrderLineItemId: lineItem.id,
            employeeId: hourlyLabourCharge.employeeId,
            name: hourlyLabourCharge.name,
            rate: hourlyLabourCharge.rate,
            hours: hourlyLabourCharge.hours,
          });
        } else if (fixedPriceLabourCharge) {
          fixedPriceLabourCharges.splice(fixedPriceLabourCharges.indexOf(fixedPriceLabourCharge), 1);

          await db.workOrderMigration.createNewWorkOrderFixedPriceLabourCharge({
            workOrderId: newWorkOrder.id,
            uuid: uuid(),
            workOrderItemUuid: null,
            shopifyOrderLineItemId: lineItem.id,
            employeeId: fixedPriceLabourCharge.employeeId,
            name: fixedPriceLabourCharge.name,
            amount: fixedPriceLabourCharge.amount,
          });
        } else {
          throw new Error(
            `Migration failed - charge line item not found - ${lineItem.id} - ${lineItem.name} - ${chargeLineItemUuid} - ${lineItem.originalTotalSet.shopMoney.amount}`,
          );
        }
      }
    }

    if (hourlyLabourCharges.length > 0) {
      throw new Error('Trailing hourly charges');
    }

    if (fixedPriceLabourCharges.length > 0) {
      throw new Error('Trailing fixed price charges');
    }

    await db.workOrderMigration.removeOldHourlyLabour({ workOrderId: oldWorkOrder.id });
    await db.workOrderMigration.removeOldFixedPriceLabour({ workOrderId: oldWorkOrder.id });
    await db.workOrderMigration.removeOldWorkOrder({ workOrderId: oldWorkOrder.id });
  });
}

function chargeNameMatchesLineItemName(chargeName: string, lineItemName: string) {
  return lineItemName.startsWith(chargeName) && /^\d*$/.test(lineItemName.slice(chargeName.length).trim());
}
