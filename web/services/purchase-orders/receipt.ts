import {
  getPurchaseOrder,
  getPurchaseOrderReceipt,
  insertPurchaseOrderReceipt,
  insertPurchaseOrderReceiptLineItems,
  updatePurchaseOrderReceipt,
} from './queries.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { UpsertPurchaseOrderReceipt } from '../../schemas/generated/upsert-purchase-order-receipt.js';
import { unit } from '../db/unit-of-work.js';

// TODO: Endpoint
export async function upsertReceipt(
  shop: string,
  name: string,
  upsertPurchaseOrderReceipt: UpsertPurchaseOrderReceipt,
  locationIds: ID[] | null,
) {
  const purchaseOrder = await getPurchaseOrder({ shop, name, locationIds });

  if (!purchaseOrder) {
    throw new HttpError(`Purchase order with name ${upsertPurchaseOrderReceipt.name} not found`, 404);
  }

  if (upsertPurchaseOrderReceipt.id) {
    const existingReceipt = await getPurchaseOrderReceipt(purchaseOrder.id);

    if (!existingReceipt) {
      throw new HttpError(`Receipt with id ${upsertPurchaseOrderReceipt.id} not found`, 404);
    }

    if (upsertPurchaseOrderReceipt.lineItems.length > 0) {
      // client should send empty array if updating
      throw new HttpError('Receipt line items cannot be changed', 400);
    }
  }

  await unit(async () => {
    const purchaseOrderReceiptId = !!upsertPurchaseOrderReceipt.id
      ? await updatePurchaseOrderReceipt({
          name: upsertPurchaseOrderReceipt.name,
          description: upsertPurchaseOrderReceipt.description,
          purchaseOrderId: purchaseOrder.id,
          purchaseOrderReceiptId: upsertPurchaseOrderReceipt.id,
        })
      : await insertPurchaseOrderReceipt({
          name: upsertPurchaseOrderReceipt.name,
          description: upsertPurchaseOrderReceipt.description,
          purchaseOrderId: purchaseOrder.id,
        });

    await insertPurchaseOrderReceiptLineItems(
      { purchaseOrderId: purchaseOrder.id, purchaseOrderReceiptId },
      upsertPurchaseOrderReceipt.lineItems,
    );
  });
}
