import {
  deletePurchaseOrderReceiptLineItems,
  getPurchaseOrder,
  getPurchaseOrderReceipt,
  insertPurchaseOrderReceipt,
  insertPurchaseOrderReceiptLineItems,
  updatePurchaseOrderReceipt,
} from './queries.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { UpsertPurchaseOrderReceipt } from '../../schemas/generated/upsert-purchase-order-receipt.js';
import { unit } from '../db/unit-of-work.js';
import { Session } from '@shopify/shopify-api';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { getDetailedPurchaseOrder } from './get.js';
import { getNewPurchaseOrderReceiptName } from '../id-formatting.js';
import { adjustPurchaseOrderShopifyInventory } from './upsert.js';
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

    await deletePurchaseOrderReceiptLineItems({ purchaseOrderReceiptIds: [purchaseOrderReceiptId] });

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

    const newPurchaseOrder = (await getDetailedPurchaseOrder(session, name, locationIds)) ?? never('We just made it');
    await adjustPurchaseOrderShopifyInventory(session, user, purchaseOrder, newPurchaseOrder);
  });
}
