import { CreateWorkOrder } from '../../schemas/generated/create-work-order.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { assertValidUuid } from '../../util/uuid.js';

export function validateCreateWorkOrder(createWorkOrder: CreateWorkOrder) {
  for (const item of createWorkOrder.items) {
    assertValidUuid(item.uuid);

    if (item.quantity <= 0) {
      throw new HttpError(`Item quantity must be positive. Found ${item.quantity}`, 400);
    }
  }

  const itemUuids = createWorkOrder.items.map(item => item.uuid);
  const itemUuidsSet = new Set(itemUuids);

  for (const charge of createWorkOrder.charges) {
    assertValidUuid(charge.uuid);

    if (charge.workOrderItemUuid !== null) {
      assertValidUuid(charge.workOrderItemUuid);

      if (!itemUuidsSet.has(charge.workOrderItemUuid)) {
        throw new HttpError(`Charge references non-existent work order item ${charge.workOrderItemUuid}`, 400);
      }
    }

    if (charge.type === 'hourly-labour') {
      if (BigDecimal.fromDecimal(charge.hours).compare(BigDecimal.ZERO) < 0) {
        throw new HttpError(`Labour hours must be non-negative. Found ${charge.hours}`, 400);
      }

      if (BigDecimal.fromMoney(charge.rate).compare(BigDecimal.ZERO) < 0) {
        throw new HttpError(`Labour rate must be non-negative. Found ${charge.rate}`, 400);
      }
    } else if (charge.type === 'fixed-price-labour') {
      if (BigDecimal.fromMoney(charge.amount).compare(BigDecimal.ZERO) < 0) {
        throw new HttpError(`Labour cost must be non-negative. Found ${charge.amount}`, 400);
      }
    } else {
      return charge satisfies never;
    }
  }

  const hourlyLabourChargeUuids = createWorkOrder.charges
    .filter(hasPropertyValue('type', 'hourly-labour'))
    .map(charge => charge.uuid);
  const fixedPriceLabourChargeUuids = createWorkOrder.charges
    .filter(hasPropertyValue('type', 'fixed-price-labour'))
    .map(charge => charge.uuid);

  if (itemUuidsSet.size !== itemUuids.length) {
    throw new HttpError('Work order items must have unique uuids', 400);
  }

  if (new Set(hourlyLabourChargeUuids).size !== hourlyLabourChargeUuids.length) {
    throw new HttpError('Hourly labour charges must have unique uuids', 400);
  }

  if (new Set(fixedPriceLabourChargeUuids).size !== fixedPriceLabourChargeUuids.length) {
    throw new HttpError('Fixed price labour charges must have unique uuids', 400);
  }
}
