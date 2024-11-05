import { LocalsTeifiUser } from '../../decorators/permission.js';
import { Session } from '@shopify/shopify-api';
import { getDetailedPurchaseOrder } from './get.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import * as queries from './queries.js';

export async function deletePurchaseOrderReceipt(
  session: Session,
  user: LocalsTeifiUser,
  { purchaseOrderName, receiptName }: { purchaseOrderName: string; receiptName: string },
) {
  const purchaseOrder = await getDetailedPurchaseOrder(session, purchaseOrderName, user.user.allowedLocationIds);

  if (!purchaseOrder) {
    throw new HttpError('Purchase order not found', 404);
  }

  const receipt = purchaseOrder.receipts.find(receipt => receipt.name === receiptName);

  if (!receipt) {
    throw new HttpError('Receipt not found', 404);
  }

  if (receipt.status === 'COMPLETED') {
    throw new HttpError('Completed receipts cannot be deleted');
  }

  await queries.deletePurchaseOrderReceiptLineItems({ purchaseOrderReceiptId: receipt.id });
  await queries.deletePurchaseOrderReceipt({ purchaseOrderReceiptId: receipt.id });
}
