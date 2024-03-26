import { Session } from '@shopify/shopify-api';
import { db } from '../db/db.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { getNewPurchaseOrderName } from '../id-formatting.js';
import { unit } from '../db/unit-of-work.js';
import { getPurchaseOrder } from './get.js';
import { Int, InventoryChangeInput } from '../gql/queries/generated/schema.js';
import { gql } from '../gql/gql.js';
import { Graphql, sentryErr } from '@teifi-digital/shopify-app-express/services';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { entries } from '@teifi-digital/shopify-app-toolbox/object';
import { sendPurchaseOrderWebhook } from './webhook.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { ensureProductVariantsExist } from '../product-variants/sync.js';
import { CreatePurchaseOrder } from '../../schemas/generated/create-purchase-order.js';
import { PurchaseOrder } from './types.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { ensureShopifyOrdersExist } from '../shopify-order/sync.js';
import { ensureLocationsExist } from '../locations/sync.js';
import { ensureEmployeesExist } from '../employee/sync.js';
import { getAverageUnitCostForProductVariant } from './average-unit-cost.js';

export async function upsertPurchaseOrder(session: Session, createPurchaseOrder: CreatePurchaseOrder) {
  const { shop } = session;

  return await unit(async () => {
    const name = createPurchaseOrder.name ?? (await getNewPurchaseOrderName(shop));

    const isNew = createPurchaseOrder.name === null;
    const existingPurchaseOrder = isNew ? null : await getPurchaseOrder(session, name);

    const productVariantIds = createPurchaseOrder.lineItems.map(({ productVariantId }) => productVariantId);
    await ensureProductVariantsExist(session, productVariantIds);

    if (createPurchaseOrder.locationId !== null) {
      await ensureLocationsExist(session, [createPurchaseOrder.locationId]);
    }

    const employeeIds = createPurchaseOrder.employeeAssignments.map(({ employeeId }) => employeeId);
    await ensureEmployeesExist(session, employeeIds);

    const orderIds = unique(
      createPurchaseOrder.lineItems
        .map(({ shopifyOrderLineItem }) => shopifyOrderLineItem?.orderId)
        .filter(isNonNullable),
    );

    await ensureShopifyOrdersExist(session, orderIds);

    const [{ id: purchaseOrderId } = never()] = await db.purchaseOrder.upsert({
      shop,
      name,
      status: createPurchaseOrder.status,
      vendorName: createPurchaseOrder.vendorName,
      locationId: createPurchaseOrder.locationId,
      note: createPurchaseOrder.note,
      shipFrom: createPurchaseOrder.shipFrom,
      shipTo: createPurchaseOrder.shipTo,
      deposited: createPurchaseOrder.deposited,
      paid: createPurchaseOrder.paid,
      discount: createPurchaseOrder.discount,
      tax: createPurchaseOrder.tax,
      shipping: createPurchaseOrder.shipping,
    });

    await Promise.all([
      db.purchaseOrder.removeLineItems({ purchaseOrderId }),
      db.purchaseOrder.removeCustomFields({ purchaseOrderId }),
      db.purchaseOrder.removeAssignedEmployees({ purchaseOrderId }),
    ]);

    await Promise.all([
      ...createPurchaseOrder.lineItems.map(product =>
        db.purchaseOrder.insertLineItem({
          productVariantId: product.productVariantId,
          purchaseOrderId: purchaseOrderId,
          availableQuantity: product.availableQuantity,
          quantity: product.quantity,
          unitCost: product.unitCost,
          shopifyOrderLineItemId: product.shopifyOrderLineItem?.id,
        }),
      ),
      ...Object.entries(createPurchaseOrder.customFields).map(([key, value]) =>
        db.purchaseOrder.insertCustomField({ purchaseOrderId, key, value }),
      ),
      ...createPurchaseOrder.employeeAssignments.map(employee =>
        db.purchaseOrder.insertAssignedEmployee({ employeeId: employee.employeeId, purchaseOrderId }),
      ),
    ]);

    const newPurchaseOrder = (await getPurchaseOrder(session, name)) ?? never('We just made it');

    await adjustShopifyInventory(session, existingPurchaseOrder, newPurchaseOrder);
    await adjustShopifyInventoryItemCosts(session, existingPurchaseOrder, newPurchaseOrder);

    sendPurchaseOrderWebhook(session, name).catch(error => {
      sentryErr('Failed to send webhook', { error });
    });

    return { name };
  });
}

/**
 * Creates an inventory adjustment to reflect the change in inventory due to the purchase order.
 */
async function adjustShopifyInventory(
  session: Session,
  oldPurchaseOrder: PurchaseOrder | null,
  newPurchaseOrder: PurchaseOrder,
) {
  const deltaByLocationByInventoryItemId: Record<ID, Record<ID, Int>> = {};

  // remove old inventory
  if (oldPurchaseOrder?.location) {
    const deltaByInventoryItemId = (deltaByLocationByInventoryItemId[oldPurchaseOrder.location.id] ??= {});

    for (const {
      productVariant: { inventoryItemId },
      availableQuantity,
    } of oldPurchaseOrder.lineItems) {
      assertGid(inventoryItemId);

      const current = (deltaByInventoryItemId[inventoryItemId] ??= 0 as Int);
      deltaByInventoryItemId[inventoryItemId] = (current - availableQuantity) as Int;
    }
  }

  // add new inventory
  if (newPurchaseOrder?.location) {
    const deltaByInventoryItemId = (deltaByLocationByInventoryItemId[newPurchaseOrder.location.id] ??= {});

    for (const {
      productVariant: { inventoryItemId },
      availableQuantity,
    } of newPurchaseOrder.lineItems) {
      assertGid(inventoryItemId);

      const current = (deltaByInventoryItemId[inventoryItemId] ??= 0 as Int);
      deltaByInventoryItemId[inventoryItemId] = (current + availableQuantity) as Int;
    }
  }

  const changes: InventoryChangeInput[] = [];
  for (const [locationId, deltaByInventoryItemId] of entries(deltaByLocationByInventoryItemId)) {
    for (const [inventoryItemId, delta] of entries(deltaByInventoryItemId)) {
      changes.push({
        locationId,
        inventoryItemId,
        delta,
      });
    }
  }

  const graphql = new Graphql(session);
  const { inventoryAdjustQuantities } = await gql.inventory.adjust.run(graphql, {
    input: { name: 'available', reason: 'correction', changes },
  });

  if (!inventoryAdjustQuantities) {
    throw new HttpError('Failed to adjust inventory', 500);
  }

  const { userErrors } = inventoryAdjustQuantities;
  if (userErrors.length > 0) {
    sentryErr('Failed to adjust inventory', { userErrors });
    throw new HttpError('Failed to adjust inventory', 500);
  }
}

/**
 * Updates the Inventory Item cost for each product in this purchase order to the average cost of this product over all time
 */
async function adjustShopifyInventoryItemCosts(
  session: Session,
  oldPurchaseOrder: PurchaseOrder | null,
  newPurchaseOrder: PurchaseOrder,
) {
  const graphql = new Graphql(session);

  const productVariantIds = unique(
    [...(oldPurchaseOrder?.lineItems ?? []), ...newPurchaseOrder.lineItems].map(({ productVariant }) => {
      const productVariantId = productVariant.id;
      assertGid(productVariantId);
      return productVariantId;
    }),
  );

  const productVariants = productVariantIds.length
    ? await db.productVariants.getMany({ productVariantIds }).then(rows =>
        rows.map(row => {
          assertGid(row.productVariantId);
          assertGid(row.inventoryItemId);
          return {
            ...row,
            productVariantId: row.productVariantId,
            inventoryItemId: row.inventoryItemId,
          };
        }),
      )
    : [];

  if (productVariantIds.length !== productVariants.length) {
    sentryErr('Failed to get all product variants', {
      oldProductVariantIds: oldPurchaseOrder?.lineItems.map(li => li.productVariant.id),
      newProductVariantIds: newPurchaseOrder.lineItems.map(li => li.productVariant.id),
      foundProductVariantIds: productVariants.map(pv => pv.productVariantId),
    });
  }

  const processProductVariant = async ({
    productVariantId,
    inventoryItemId,
  }: {
    productVariantId: ID;
    inventoryItemId: ID;
  }) => {
    const averageCost = await getAverageUnitCostForProductVariant(session.shop, productVariantId);

    await gql.inventoryItems.updateInventoryItem.run(graphql, {
      id: inventoryItemId,
      input: { cost: averageCost.toDecimal() },
    });
  };

  return await Promise.all(productVariants.map(processProductVariant));
}
