import { LocalsTeifiUser } from '../../decorators/permission.js';
import { Session } from '@shopify/shopify-api';
import { getDetailedPurchaseOrder } from './get.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import * as queries from './queries.js';
import { unit } from '../db/unit-of-work.js';
import { deleteTaskPurchaseOrderLinks } from '../tasks/queries.js';
import { awaitNested } from '@teifi-digital/shopify-app-toolbox/promise';
import { zip } from '@teifi-digital/shopify-app-toolbox/iteration';

// TODO: Show individual delete button in purchase order/work order too OR reason for not being able to delete

export async function deletePurchaseOrders(session: Session, user: LocalsTeifiUser, names: string[]) {
  if (!names.length) {
    return [];
  }

  return await unit(async () => {
    const { purchaseOrders, ids } = await awaitNested({
      purchaseOrders: names.map(name => getDetailedPurchaseOrder(session, name, user.user.allowedLocationIds)),
      ids: names.map(name =>
        queries
          .getPurchaseOrder({ shop: session.shop, name, locationIds: user.user.allowedLocationIds })
          .then(po => po?.id),
      ),
    });

    const errors: [name: string, error: HttpError][] = [];
    const purchaseOrderIds: number[] = [];
    const purchaseOrderReceiptIds: number[] = [];

    for (const [[purchaseOrder, purchaseOrderId], name] of zip(zip(purchaseOrders, ids), names)) {
      if (!purchaseOrder || purchaseOrderId === undefined) {
        errors.push([name, new HttpError(`Purchase order ${name} not found`, 404)]);
        continue;
      }

      if (purchaseOrder.receipts.some(receipt => receipt.status === 'COMPLETED')) {
        errors.push([name, new HttpError(`Cannot delete ${name}, as it has completed receipts`, 400)]);
        continue;
      }

      purchaseOrderIds.push(purchaseOrderId);
      purchaseOrderReceiptIds.push(...purchaseOrder.receipts.map(receipt => receipt.id));
    }

    await Promise.all([
      queries
        .deletePurchaseOrderReceiptLineItems({ purchaseOrderReceiptIds })
        .then(() => queries.deletePurchaseOrderReceipts({ purchaseOrderReceiptIds })),

      queries
        .deletePurchaseOrderLineItemCustomFields({ purchaseOrderIds })
        .then(() => queries.deletePurchaseOrderLineItems({ purchaseOrderIds })),

      queries.deletePurchaseOrderCustomFields({ purchaseOrderIds }),
      queries.deletePurchaseOrderAssignedEmployees({ purchaseOrderIds }),
      deleteTaskPurchaseOrderLinks({ purchaseOrderIds }),
    ]);

    await queries.deletePurchaseOrders({ purchaseOrderIds });

    return errors;
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
