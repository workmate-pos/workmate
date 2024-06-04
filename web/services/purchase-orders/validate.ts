import { CreatePurchaseOrder } from '../../schemas/generated/create-purchase-order.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { assertValidUuid } from '../../util/uuid.js';

export function validateCreatePurchaseOrder(createPurchaseOrder: CreatePurchaseOrder) {
  for (const item of createPurchaseOrder.lineItems) {
    assertValidUuid(item.uuid);

    if (item.quantity <= 0) {
      throw new HttpError(`Item quantity must be positive. Found ${item.quantity}`, 400);
    }
  }

  const itemUuids = createPurchaseOrder.lineItems.map(item => item.uuid);
  const itemUuidsSet = new Set(itemUuids);

  if (itemUuidsSet.size !== itemUuids.length) {
    throw new HttpError('Work order items must have unique uuids', 400);
  }
}
