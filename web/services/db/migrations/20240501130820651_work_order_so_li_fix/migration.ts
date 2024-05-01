/**
 * This file contains logic required to migrate from single-order work orders to multi-order work orders.
 * This change replaces a WO -> SO relation with a WO line item -> SO line item relation.
 * This means that we must go through all old work orders, fetch them, and create line item relations.
 */

import { db } from '../../db.js';
import { IGetAllOldResult } from '../../queries/generated/work-order-so-li-migration.sql.js';
import {
  getProductServiceType,
  QUANTITY_ADJUSTING_SERVICE,
} from '@work-orders/common/metafields/product-service-type.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { shopifySessionToSession } from '../../../shopify-sessions.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { transaction } from '../../transaction.js';
import { ensureShopifyOrdersExist } from '../../../shopify-order/sync.js';
import { ensureCustomersExist } from '../../../customer/sync.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { v4 as uuid } from 'uuid';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { gql } from '../../../gql/gql.js';

export default async function migrate() {
  await migrateWorkOrders();
}

export async function migrateWorkOrders() {
  const oldWorkOrders = await db.migrations.workOrderSoLi.getAllOld();

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
    const hourlyLabourCharges = await db.migrations.workOrderSoLi.getOldHourlyLabours({ workOrderId: oldWorkOrder.id });
    const fixedPriceLabourCharges = await db.migrations.workOrderSoLi.getOldFixedPriceLabours({
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

    const [newWorkOrder = never()] = await db.migrations.workOrderSoLi.createNewWorkOrder({
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

        const [newWorkOrderItem = never()] = await db.migrations.workOrderSoLi.createNewWorkOrderItem({
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

            await db.migrations.workOrderSoLi.createNewWorkOrderHourlyLabourCharge({
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

            await db.migrations.workOrderSoLi.createNewWorkOrderFixedPriceLabourCharge({
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
        // Custom sale - it must be a charge (or actual custom sale).
        // Custom attributes:
        // - chargeLineItemUuid (_Charge Line Item UUID)
        // - sku (SKU)

        const isPlaceHolder = lineItem.customAttributes.some(ca => ca.key === '_Is Placeholder');

        if (isPlaceHolder) {
          continue;
        }

        const chargeLineItemUuid = lineItem.customAttributes.find(ca => ca.key === '_Charge Line Item UUID')?.value;

        if (!chargeLineItemUuid) {
          // actual custom sale
          continue;
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

          await db.migrations.workOrderSoLi.createNewWorkOrderHourlyLabourCharge({
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

          await db.migrations.workOrderSoLi.createNewWorkOrderFixedPriceLabourCharge({
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

    await db.migrations.workOrderSoLi.removeOldHourlyLabour({ workOrderId: oldWorkOrder.id });
    await db.migrations.workOrderSoLi.removeOldFixedPriceLabour({ workOrderId: oldWorkOrder.id });
    await db.migrations.workOrderSoLi.removeOldWorkOrder({ workOrderId: oldWorkOrder.id });
  });
}

function chargeNameMatchesLineItemName(chargeName: string, lineItemName: string) {
  return lineItemName.startsWith(chargeName) && /^\d*$/.test(lineItemName.slice(chargeName.length).trim());
}
