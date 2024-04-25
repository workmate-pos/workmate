/**
 * This file contains logic required to migrate from single-order work orders to multi-order work orders.
 * This change replaces a WO -> SO relation with a WO line item -> SO line item relation.
 * This means that we must go through all old work orders, fetch them, and create line item relations.
 */

import { db } from '../services/db/db.js';
import { IGetAllResult } from '../services/db/queries/generated/work-order-migration.sql.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { gql } from '../services/gql/gql.js';
import { shopifySessionToSession } from '../services/shopify-sessions.js';
import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { transaction } from '../services/db/transaction.js';
import { getShopSettings } from '../services/settings.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';

export async function migrateWorkOrders() {
  const TEST_STORE = 'work-orders-pos.myshopify.com';
  const REVIEW_STORE = '62d6a1-2.myshopify.com';
  const DELETED_STORE = '50d18c.myshopify.com';

  const workOrders = await db.workOrderMigration
    .getAll()
    .then(wos => wos.filter(wo => ![TEST_STORE, REVIEW_STORE, DELETED_STORE].includes(wo.shop)));

  console.log(`Migrating ${workOrders.length} work orders`);

  let successCount = 0;

  for (const [i, workOrder] of workOrders.entries()) {
    const prefix = `[${i + 1} / ${workOrders.length}] [${workOrder.id}] [${workOrder.shop}] [${workOrder.name}]`;

    await migrateWorkOrder(workOrder)
      .then(() => {
        successCount++;
      })
      .catch(e => console.error(prefix, 'Migration failed:', e.message));
  }

  console.log(`Migrations completed. Successfully migrated ${successCount} / ${workOrders.length} work orders`);
}

async function migrateWorkOrder(workOrder: IGetAllResult) {
  const [session] = await db.shopifySession.get({ shop: workOrder.shop, isOnline: false });

  if (!session) {
    throw new Error('No session available');
  }

  const settings = await getShopSettings(session.shop);
  const mutableServiceCollectionId = settings.mutableServiceCollectionId ?? createGid('Collection', '0');
  const includeIsMutableServiceItem = !!settings?.mutableServiceCollectionId;

  await transaction(async () => {
    // TODO: Create new work order

    const hourlyLabourCharges = await db.workOrderMigration.getHourlyLabours({ workOrderId: workOrder.id });
    const fixedPriceLabourCharges = await db.workOrderMigration.getFixedPriceLabours({ workOrderId: workOrder.id });

    const graphql = new Graphql(shopifySessionToSession(session));

    let lineItems: (
      | gql.workOrderMigration.OrderLineItemFragment.Result
      | gql.workOrderMigration.DraftOrderLineItemFragment.Result
    )[] = [];

    if (workOrder.orderId) {
      const { order } = await gql.workOrderMigration.getOrder.run(graphql, {
        id: workOrder.orderId as ID,
        mutableServiceCollectionId,
        includeIsMutableServiceItem,
      });

      if (!order) return;

      if (order.lineItems.pageInfo.hasNextPage) {
        throw new Error('Didnt fetch all line items. Increase the limit');
      }

      lineItems = order.lineItems.nodes;
    } else if (workOrder.draftOrderId) {
      const { draftOrder } = await gql.workOrderMigration.getDraftOrder.run(graphql, {
        id: workOrder.draftOrderId as ID,
        mutableServiceCollectionId,
        includeIsMutableServiceItem,
      });

      if (!draftOrder) return;

      if (draftOrder.lineItems.pageInfo.hasNextPage) {
        throw new Error('Didnt fetch all line items. Increase the limit');
      }

      lineItems = draftOrder.lineItems.nodes;
    }

    // TODO: Create order in database

    for (const lineItem of lineItems) {
      if (lineItem.variant) {
        // A product or a mutable line item.

        const variantId = lineItem.variant.id;

        // TODO: Create a new WorkOrderItem (copy quantity, but qty=0 if mutable)

        if (lineItem.variant.product.isMutableServiceItem) {
          const linkedHourlyLabourCharges = hourlyLabourCharges.filter(hlc => hlc.productVariantId === variantId);
          const linkedFixedPriceLabourCharges = fixedPriceLabourCharges.filter(
            fplc => fplc.productVariantId === variantId,
          );

          // TODO: Link these to the line item

          for (const linkedHourlyLabourCharge of linkedHourlyLabourCharges) {
            // TODO: link
            hourlyLabourCharges.splice(hourlyLabourCharges.indexOf(linkedHourlyLabourCharge), 1);
          }

          for (const linkedFixedPriceLabourCharge of linkedFixedPriceLabourCharges) {
            // TODO: link
            fixedPriceLabourCharges.splice(fixedPriceLabourCharges.indexOf(linkedFixedPriceLabourCharge), 1);
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
            hlc.name === lineItem.name &&
            BigDecimal.fromString(hlc.hours)
              .multiply(BigDecimal.fromString(hlc.rate))
              .equals(BigDecimal.fromDecimal(lineItem.originalTotalSet.shopMoney.amount))
          );
        });

        const fixedPriceLabourCharge = fixedPriceLabourCharges.find(
          fplc =>
            fplc.lineItemUuid === chargeLineItemUuid &&
            fplc.name === lineItem.name &&
            BigDecimal.fromString(fplc.amount).equals(
              BigDecimal.fromDecimal(lineItem.originalTotalSet.shopMoney.amount),
            ),
        );

        if (hourlyLabourCharge) {
          // TODO: link
          hourlyLabourCharges.splice(hourlyLabourCharges.indexOf(hourlyLabourCharge), 1);
        } else if (fixedPriceLabourCharge) {
          // TODO: link
          fixedPriceLabourCharges.splice(fixedPriceLabourCharges.indexOf(fixedPriceLabourCharge), 1);
        } else {
          throw new Error(
            `Migration failed - charge line item not found - ${lineItem.name} - ${chargeLineItemUuid} - ${lineItem.customAttributes.map(ca => ca.key)}`,
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

    // TODO: Delete old work order/charges/etc
    await db.workOrderMigration.removeHourlyLabour({ workOrderId: workOrder.id });
    await db.workOrderMigration.removeFixedPriceLabour({ workOrderId: workOrder.id });
    await db.workOrderMigration.removeWorkOrder({ workOrderId: workOrder.id });
  });
}
