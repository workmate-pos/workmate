import {
  deletePurchaseOrderReceiptLineItems,
  getPurchaseOrder,
  getPurchaseOrderReceipt,
  insertPurchaseOrderReceipt,
  insertPurchaseOrderReceiptLineItems,
  updatePurchaseOrderReceipt,
} from './queries.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { GraphqlUserErrors, HttpError } from '@teifi-digital/shopify-app-express/errors';
import { UpsertPurchaseOrderReceipt } from '../../schemas/generated/upsert-purchase-order-receipt.js';
import { unit } from '../db/unit-of-work.js';
import { Session } from '@shopify/shopify-api';
import { DetailedPurchaseOrder } from './types.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { entries } from '@teifi-digital/shopify-app-toolbox/object';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { getDetailedPurchaseOrder } from './get.js';
import { getNewPurchaseOrderReceiptName } from '../id-formatting.js';
import { MoveInventoryQuantities, mutateInventoryQuantities } from '../inventory/adjust.js';
import { LocalsTeifiUser } from '../../decorators/permission.js';

export async function upsertReceipt(
  session: Session,
  user: LocalsTeifiUser,
  purchaseOrderName: string,
  upsertPurchaseOrderReceipt: UpsertPurchaseOrderReceipt,
) {
  const locationIds = user.user.allowedLocationIds;

  const [purchaseOrder, purchaseOrderId] = await Promise.all([
    getDetailedPurchaseOrder(session, purchaseOrderName, locationIds),
    getPurchaseOrder({ shop: session.shop, name: purchaseOrderName, locationIds }).then(po => po?.id),
  ]);

  if (!purchaseOrder || !purchaseOrderId) {
    throw new HttpError(`Purchase order with name ${upsertPurchaseOrderReceipt.name} not found`, 404);
  }

  let purchaseOrderReceiptId: number | null = null;

  if (upsertPurchaseOrderReceipt.name) {
    const existingReceipt = await getPurchaseOrderReceipt({
      shop: session.shop,
      name: upsertPurchaseOrderReceipt.name,
    });

    if (!existingReceipt) {
      throw new HttpError(`Receipt ${upsertPurchaseOrderReceipt.name} not found`, 404);
    }

    if (existingReceipt.status === 'COMPLETED' && upsertPurchaseOrderReceipt.lineItems.length > 0) {
      // client should send empty array if updating
      throw new HttpError("Completed receipts' line items cannot be changed", 400);
    }

    purchaseOrderReceiptId = existingReceipt.id;
  }

  await unit(async () => {
    let name: string;
    ({ id: purchaseOrderReceiptId, name } = !!purchaseOrderReceiptId
      ? await updatePurchaseOrderReceipt({
          purchaseOrderReceiptId,
          description: upsertPurchaseOrderReceipt.description,
          purchaseOrderId: purchaseOrderId,
          receivedAt: new Date(upsertPurchaseOrderReceipt.receivedAt),
          status: upsertPurchaseOrderReceipt.status,
        })
      : await insertPurchaseOrderReceipt({
          shop: session.shop,
          name: await getNewPurchaseOrderReceiptName(session.shop),
          description: upsertPurchaseOrderReceipt.description,
          purchaseOrderId: purchaseOrderId,
          receivedAt: new Date(upsertPurchaseOrderReceipt.receivedAt),
          status: upsertPurchaseOrderReceipt.status,
        }));

    await deletePurchaseOrderReceiptLineItems({ purchaseOrderReceiptId });

    for (const { uuid, quantity } of upsertPurchaseOrderReceipt.lineItems) {
      // TODO: How shoudl we handle statuses here? doesnt make snese to count archived

      const newAvailableQuantity =
        quantity +
        purchaseOrder.receipts
          .filter(receipt => receipt.id !== purchaseOrderReceiptId)
          .flatMap(receipt => receipt.lineItems)
          .filter(hasPropertyValue('uuid', uuid))
          .map(lineItem => lineItem.quantity)
          .reduce((a, b) => a + b, 0);

      const orderedQuantity = purchaseOrder.lineItems
        .filter(hasPropertyValue('uuid', uuid))
        .map(lineItem => lineItem.quantity)
        .reduce((a, b) => a + b, 0);

      if (newAvailableQuantity > orderedQuantity) {
        throw new HttpError(
          'Receipt line item quantity cannot be greater than the purchase order line item quantity',
          400,
        );
      }
    }

    await insertPurchaseOrderReceiptLineItems(
      { purchaseOrderId, purchaseOrderReceiptId },
      upsertPurchaseOrderReceipt.lineItems,
    );

    if (purchaseOrder) {
      await adjustShopifyInventory(session, user, purchaseOrder, { ...upsertPurchaseOrderReceipt, name });
    }
  });
}

/**
 * Adjusts `available` inventory quantity to reflect the purchase order receipt.
 * Note: we do not have to check received quantity - receipts will automatically reduce incoming and increase available.
 */
async function adjustShopifyInventory(
  session: Session,
  user: LocalsTeifiUser,
  purchaseOrder: DetailedPurchaseOrder,
  receipt: UpsertPurchaseOrderReceipt & { name: string },
) {
  if (!purchaseOrder.location) {
    return;
  }

  const deltasByInventoryItemId: Record<ID, number> = {};

  for (const { uuid, quantity } of receipt.lineItems) {
    const lineItem = purchaseOrder.lineItems.find(hasPropertyValue('uuid', uuid)) ?? never('FK');

    // delta can only be positive because we only support creating receipts, and no edits to quantities afterwards
    deltasByInventoryItemId[lineItem.productVariant.inventoryItemId] =
      (deltasByInventoryItemId[lineItem.productVariant.inventoryItemId] ?? 0) + quantity;
  }

  const changes: MoveInventoryQuantities['changes'] = [];

  for (const [inventoryItemId, delta] of entries(deltasByInventoryItemId)) {
    changes.push({
      locationId: purchaseOrder.location.id,
      quantity: delta,
      inventoryItemId,
      from: 'incoming',
      to: 'available',
    });
  }

  try {
    await mutateInventoryQuantities(session, {
      type: 'move',
      initiator: {
        type: 'purchase-order-receipt',
        name: receipt.name,
      },
      reason: 'received',
      staffMemberId: user.staffMember.id,
      changes,
    });
  } catch (error) {
    if (error instanceof GraphqlUserErrors) {
      sentryErr('Failed to adjust inventory', { userErrors: error.userErrors });
      throw new HttpError('Failed to adjust inventory', 500);
    }

    throw error;
  }
}
