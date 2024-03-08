import { Session } from '@shopify/shopify-api';
import { db } from '../db/db.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { HttpError } from '@teifi-digital/shopify-app-express/errors/http-error.js';
import { getNewPurchaseOrderName } from '../id-formatting.js';
import { unit } from '../db/unit-of-work.js';
import { getPurchaseOrder } from './get.js';
import { Int, InventoryChangeInput } from '../gql/queries/generated/schema.js';
import { gql } from '../gql/gql.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { sentryErr } from '@teifi-digital/shopify-app-express/services/sentry.js';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { entries } from '@teifi-digital/shopify-app-toolbox/object';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { ensureProductVariantsExist } from '../product-variants/sync.js';
import { CreatePurchaseOrder } from '../../schemas/generated/create-purchase-order.js';
import { PurchaseOrder } from './types.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';

export async function upsertPurchaseOrder(session: Session, createPurchaseOrder: CreatePurchaseOrder) {
  const { shop } = session;

  return await unit(async () => {
    const name = createPurchaseOrder.name ?? (await getNewPurchaseOrderName(shop));

    const isNew = createPurchaseOrder.name === null;
    const existingPurchaseOrder = isNew ? null : await getPurchaseOrder(session, name);

    const workOrderId = await getWorkOrderId(createPurchaseOrder.workOrderName, shop);

    const productVariantIds = createPurchaseOrder.lineItems.map(({ productVariantId }) => productVariantId);
    await ensureProductVariantsExist(session, productVariantIds);

    const [{ id: purchaseOrderId } = never()] = await db.purchaseOrder.upsert({
      shop,
      name,
      status: createPurchaseOrder.status,
      orderId: createPurchaseOrder.orderId,
      workOrderId: workOrderId,
      locationId: createPurchaseOrder.locationId,
      customerId: createPurchaseOrder.customerId,
      vendorCustomerId: createPurchaseOrder.vendorCustomerId,
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
      ...createPurchaseOrder.lineItems.map(product => db.purchaseOrder.insertLineItem({ ...product, purchaseOrderId })),
      ...Object.entries(createPurchaseOrder.customFields).map(([key, value]) =>
        db.purchaseOrder.insertCustomField({ purchaseOrderId, key, value }),
      ),
      ...createPurchaseOrder.employeeAssignments.map(employee =>
        db.purchaseOrder.insertAssignedEmployee({ ...employee, purchaseOrderId }),
      ),
    ]);

    const newPurchaseOrder = await getPurchaseOrder(session, name);
    await adjustShopifyInventory(session, existingPurchaseOrder, newPurchaseOrder);

    // no need to wait for this to complete
    adjustShopifyInventoryItemCosts(session, existingPurchaseOrder, newPurchaseOrder);

    return { name };
  });
}

async function getWorkOrderId(workOrderName: string | null, shop: string) {
  if (!workOrderName) {
    return null;
  }

  const [workOrder] = await db.workOrder.get({ shop, name: workOrderName });

  if (!workOrder) {
    throw new HttpError('Work order not found', 404);
  }

  return workOrder.id;
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

  const productVariants = await gql.products.getManyInventoryItems
    .run(graphql, { ids: productVariantIds })
    .then(response => response.nodes.filter(isNonNullable).filter(hasPropertyValue('__typename', 'ProductVariant')));

  const processProductVariant = async ({
    id: productVariantId,
    inventoryItem,
  }: {
    id: ID;
    inventoryItem: { id: ID };
  }) => {
    const productVariantCosts = await db.purchaseOrder.getProductVariantCostsForShop({
      shop: session.shop,
      productVariantId,
    });

    const totalCost = BigDecimal.sum(
      ...productVariantCosts.map(({ unitCost, quantity }) =>
        BigDecimal.fromString(unitCost).multiply(BigDecimal.fromString(quantity.toFixed(0))),
      ),
    );

    const totalQuantity = BigDecimal.sum(
      ...productVariantCosts.map(({ quantity }) => BigDecimal.fromString(quantity.toFixed(0))),
    );

    const averageCost = totalCost.divide(totalQuantity).round(2);

    await gql.inventoryItems.updateInventoryItem.run(graphql, {
      id: inventoryItem.id,
      input: { cost: averageCost.toDecimal() },
    });
  };

  return await Promise.all(productVariants.map(processProductVariant));
}
