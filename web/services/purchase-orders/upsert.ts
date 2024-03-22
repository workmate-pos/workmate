import { Session } from '@shopify/shopify-api';
import { CreatePurchaseOrder } from '../../schemas/generated/create-purchase-order.js';
import { db } from '../db/db.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { HttpError } from '@teifi-digital/shopify-app-express/errors/http-error.js';
import { getNewPurchaseOrderId } from '../id-formatting.js';
import { unit } from '../db/unit-of-work.js';
import { getPurchaseOrder } from './get.js';
import { Int, InventoryChangeInput } from '../gql/queries/generated/schema.js';
import { gql } from '../gql/gql.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { sentryErr } from '@teifi-digital/shopify-app-express/services/sentry.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { entries } from '@teifi-digital/shopify-app-toolbox/object';
import { sendPurchaseOrderWebhook } from './webhook.js';

export async function upsertPurchaseOrder(session: Session, createPurchaseOrder: CreatePurchaseOrder) {
  const { shop } = session;

  return await unit(async () => {
    const name = createPurchaseOrder.name ?? (await getNewPurchaseOrderId(shop));

    const isNew = createPurchaseOrder.name === null;
    const existingPurchaseOrder = isNew ? null : await getPurchaseOrder(session, name);

    if (!isNew && !existingPurchaseOrder) {
      throw new HttpError('Purchase order not found', 404);
    }

    const [{ id: purchaseOrderId } = never()] = await db.purchaseOrder.upsert({
      shop,
      name,
      status: createPurchaseOrder.status,
      orderId: createPurchaseOrder.orderId,
      orderName: createPurchaseOrder.orderName,
      workOrderName: createPurchaseOrder.workOrderName,
      locationId: createPurchaseOrder.locationId,
      customerId: createPurchaseOrder.customerId,
      vendorCustomerId: createPurchaseOrder.vendorCustomerId,
      note: createPurchaseOrder.note,
      vendorName: createPurchaseOrder.vendorName,
      customerName: createPurchaseOrder.customerName,
      locationName: createPurchaseOrder.locationName,
      shipFrom: createPurchaseOrder.shipFrom,
      shipTo: createPurchaseOrder.shipTo,
      deposited: createPurchaseOrder.deposited,
      paid: createPurchaseOrder.paid,
      discount: createPurchaseOrder.discount,
      tax: createPurchaseOrder.tax,
      shipping: createPurchaseOrder.shipping,
      subtotal: createPurchaseOrder.subtotal,
    });

    await Promise.all([
      db.purchaseOrder.removeProducts({ purchaseOrderId }),
      db.purchaseOrder.removeCustomFields({ purchaseOrderId }),
      db.purchaseOrder.removeAssignedEmployees({ purchaseOrderId }),
    ]);

    await Promise.all([
      ...createPurchaseOrder.products.map(product => db.purchaseOrder.insertProduct({ ...product, purchaseOrderId })),
      ...Object.entries(createPurchaseOrder.customFields).map(([key, value]) =>
        db.purchaseOrder.insertCustomField({ purchaseOrderId, key, value }),
      ),
      ...createPurchaseOrder.employeeAssignments.map(employee =>
        db.purchaseOrder.insertAssignedEmployee({ ...employee, purchaseOrderId }),
      ),
    ]);

    await adjustShopifyInventory(session, existingPurchaseOrder, createPurchaseOrder);

    sendPurchaseOrderWebhook(session, name).catch(error => {
      sentryErr('Failed to send webhook', { error });
    });

    return { name };
  });
}

async function adjustShopifyInventory(
  session: Session,
  oldPurchaseOrder: CreatePurchaseOrder | null,
  newPurchaseOrder: CreatePurchaseOrder,
) {
  const deltaByLocationByInventoryItemId: Record<ID, Record<ID, Int>> = {};

  // remove old inventory
  if (oldPurchaseOrder?.locationId) {
    const deltaByInventoryItemId = (deltaByLocationByInventoryItemId[oldPurchaseOrder.locationId] ??= {});

    for (const { inventoryItemId, availableQuantity } of oldPurchaseOrder.products) {
      const current = (deltaByInventoryItemId[inventoryItemId] ??= 0 as Int);
      deltaByInventoryItemId[inventoryItemId] = (current - availableQuantity) as Int;
    }
  }

  // add new inventory
  if (newPurchaseOrder?.locationId) {
    const deltaByInventoryItemId = (deltaByLocationByInventoryItemId[newPurchaseOrder.locationId] ??= {});

    for (const { inventoryItemId, availableQuantity } of newPurchaseOrder.products) {
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
