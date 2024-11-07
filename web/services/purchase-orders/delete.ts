import { LocalsTeifiUser } from '../../decorators/permission.js';
import { Session } from '@shopify/shopify-api';
import { getDetailedPurchaseOrder } from './get.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import * as queries from './queries.js';
import { unit } from '../db/unit-of-work.js';
import { deleteTaskPurchaseOrderLinks } from '../tasks/queries.js';

// TODO: Show individual delete button in purchase order/work order too OR reason for not being able to delete

export async function deletePurchaseOrder(session: Session, user: LocalsTeifiUser, name: string) {
  await unit(async () => {
    const [purchaseOrder, purchaseOrderId] = await Promise.all([
      getDetailedPurchaseOrder(session, name, user.user.allowedLocationIds),
      queries
        .getPurchaseOrder({ shop: session.shop, name, locationIds: user.user.allowedLocationIds })
        .then(po => po?.id),
    ]);

    if (!purchaseOrder || purchaseOrderId === undefined) {
      throw new HttpError('Purchase order not found', 404);
    }

    if (purchaseOrder.receipts.some(receipt => receipt.status === 'COMPLETED')) {
      throw new HttpError(`Cannot delete ${name}, as it has completed receipts`);
    }

    const purchaseOrderReceiptIds = purchaseOrder.receipts.map(receipt => receipt.id);

    await Promise.all([
      queries
        .deletePurchaseOrderReceiptLineItems({ purchaseOrderReceiptIds })
        .then(() => queries.deletePurchaseOrderReceipts({ purchaseOrderReceiptIds })),

      queries.deletePurchaseOrderCustomFields(purchaseOrderId),

      queries
        .deletePurchaseOrderLineItemCustomFields(purchaseOrderId)
        .then(() => queries.deletePurchaseOrderLineItems(purchaseOrderId)),

      queries.deletePurchaseOrderAssignedEmployees(purchaseOrderId),

      deleteTaskPurchaseOrderLinks({ purchaseOrderId }),
    ]);

    await queries.deletePurchaseOrder({ purchaseOrderId });
  });
}

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

  await queries.deletePurchaseOrderReceiptLineItems({ purchaseOrderReceiptIds: [receipt.id] });
  await queries.deletePurchaseOrderReceipts({ purchaseOrderReceiptIds: [receipt.id] });
}
